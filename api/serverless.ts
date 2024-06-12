import axios from 'axios';
import { google } from 'googleapis';
import { MongoClient, Db } from 'mongodb';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { findOrCreateFolder } from '../utils/findOrCreateFolder';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { VercelRequest, VercelResponse } from '@vercel/node';

// MongoDB connection setup
const { DB_USERNAME: dbUsername = '', DB_PASSWORD: dbPassword = '', DB_NAME: dbName = '', DB_CLUSTER: dbClusterName = '' } = process.env;

const uri = `mongodb+srv://${encodeURIComponent(dbUsername)}:${encodeURIComponent(dbPassword)}@${dbClusterName}/?retryWrites=true&w=majority`;

let client: MongoClient | null = null;
let db: Db | null = null;

const connectWithRetry = async (uri: string, attempts = 5): Promise<MongoClient> => {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const client = new MongoClient(uri);
			await client.connect();
			return client;
		} catch (error) {
			console.error(`Attempt ${attempt} failed: ${(error as Error).message}`);
			if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
			else throw error;
		}
	}
	throw new Error('Connection attempts exceeded.');
};

async function streamDownloader({ fileUrl, fileName, folderName, folderId, driveClients, db, user }) {
	const filesCollection = db.collection('files');
	const indexCollection = db.collection('index');

	// Check if file already exists in the database
	const existingFile = await filesCollection.findOne({ fileName, folderId });
	if (existingFile) {
		return existingFile;
	}

	const response = await axios({
		method: 'get',
		url: fileUrl,
		responseType: 'stream',
	});

	// Initialize the drive index if it does not exist
	const indexDoc = await indexCollection.findOneAndUpdate(
		{ name: 'driveIndex' },
		{ $inc: { currentDriveIndex: 1 } },
		{ returnOriginal: true, upsert: true }
	);

	if (!indexDoc.currentDriveIndex) {
		await indexCollection.insertOne({ name: 'driveIndex', currentDriveIndex: 1 });
		indexDoc.currentDriveIndex = { currentDriveIndex: 1 };
	}

	const clientIndex = (indexDoc.currentDriveIndex ?? 1) % driveClients.length;
	const drive = driveClients[clientIndex];

	// Ensure the user folder exists and get its folderId and folderName
	const { folderId: userFolderId, folderName: userFolderName } = await findOrCreateFolder(drive, user, 'root');

	const uploadResult = await streamUploadToGoogleDrive({ fileStream: response.data, fileName, folderId: userFolderId, drive });

	const fileMetadata = {
		fileName,
		folderId: userFolderId,
		folderName: folderName || userFolderName, // New field for folder name
		user, // Add the user information to the metadata
		...uploadResult,
	};

	// Save file metadata to the database
	await filesCollection.insertOne(fileMetadata);

	return fileMetadata;
}

const getServiceAccountClients = async () => {
	const serviceAccountsJson = Object.keys(process.env)
		.filter(key => key.startsWith('SERVICE_ACCOUNT_JSON_'))
		.map(key => JSON.parse(process.env[key] as string));

	const clients = await Promise.all(
		serviceAccountsJson.map(async credentials => {
			const auth: any = new google.auth.GoogleAuth({
				credentials,
				scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
			});
			const client = await auth.getClient();
			return google.drive({ version: 'v3', auth: client });
		})
	);
	return clients;
};

const connectToMongo = async (): Promise<Db> => {
	if (!client) {
		client = await connectWithRetry(uri);
		db = client.db(dbName);
	}
	return db as Db;
};

const streamUploadToGoogleDrive = async ({ fileStream, fileName, folderId, drive }) => {
	const fileMetadata = { name: fileName, parents: [folderId] };
	const media = { mimeType: '*/*', body: fileStream };

	const uploadResponse = await drive.files.create({
		requestBody: fileMetadata,
		media: media,
		fields: 'id, name, mimeType, webViewLink, webContentLink, parents, version',
	});

	// Set the uploaded file to public
	await drive.permissions.create({
		fileId: uploadResponse.data.id,
		requestBody: { type: 'anyone', role: 'reader' },
	});

	// Generate export download URL
	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return { ...uploadResponse.data, downloadUrl };
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		const db = await connectToMongo();
		const driveClients = await getServiceAccountClients();
		const { status, fileUrl, fileName, folderId, folderName, userName } = getParamsFromRequest(req);

		if (!status) {
			res.status(400).send('Missing or invalid file URL.');
			return;
		}

		const existingFile = await checkIfFileExists({ fileName, folderName, user: userName, db });
		if (existingFile) {
			console.log({ success: true, ...existingFile });
			res.status(200).json({ success: true, ...existingFile });
			return;
		}

		const fileMetadata = await streamDownloader({ fileUrl, fileName, folderName, folderId, driveClients, db, user: userName });
		res.status(200).json({ success: true, ...fileMetadata });
	} catch (error) {
		console.error('Failed to upload file:', error);
		res.status(500).json({ success: false, error: error.message });
	}
};
export default handler;
