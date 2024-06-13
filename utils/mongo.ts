import { FileDocument } from './checkIfFileExists';
import { MongoClient, Db, Collection } from 'mongodb';

const { DB_USERNAME: dbUsername = '', DB_PASSWORD: dbPeerPassword = '', DB_NAME: dbName = '', DB_CLUSTER: dbClusterName = '' } = process.env;
const uri = `mongodb+srv://${encodeURIComponent(dbUsername)}:${encodeURIComponent(dbPeerPassword)}@${dbClusterName}/?retryWrites=true&w=majority`;

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

export const connectToMongo = async (): Promise<Db> => {
	if (!client) {
		client = await connectWithRetry(uri);
		db = client.db(dbName);

		// Ensure the 'index' collection and 'driveIndex' document exist
		const indexCollection = db.collection('index');
		const indexExists = await indexCollection.countDocuments({ name: 'currentDriveIndex' });
		if (indexExists === 0) {
			await indexCollection.insertOne({ name: 'currentDriveIndex', currentDriveIndex: 0 });
		}

		// Ensure the 'settings' collection and fields exist
		const settingsCollection = db.collection('settings');
		const settingsExists = await settingsCollection.countDocuments({});
		if (settingsExists === 0) {
			await settingsCollection.insertOne({
				'app-title': `${process.env.APP_TITLE}`,
				'storage-cluster-name': `${process.env.APP_CLUSTER_NAME}`,
			});
		} else {
			const appTitleExists = await settingsCollection.countDocuments({ 'app-title': `${process.env.APP_TITLE}` });
			if (appTitleExists === 0) {
				await settingsCollection.updateOne({}, { $set: { 'app-title': `${process.env.APP_TITLE}` } });
			}

			const clusterNameExists = await settingsCollection.countDocuments({ 'storage-cluster-name': `${process.env.APP_CLUSTER_NAME}` });
			if (clusterNameExists === 0) {
				await settingsCollection.updateOne({}, { $set: { 'storage-cluster-name': `${process.env.APP_CLUSTER_NAME}` } });
			}
		}
	}
	return db as Db;
};

export async function saveFileRecordToDB(fileMetadata: FileDocument): Promise<{ status: boolean; id: string }> {
	if (!db) {
		throw new Error('Database is not connected. Ensure connectToMongo is called before.');
	}

	const filesCollection: Collection<FileDocument> = db.collection<FileDocument>('files');

	const updateResult = await filesCollection.updateOne({ id: fileMetadata.id }, { $set: fileMetadata }, { upsert: true });

	return {
		status: updateResult.acknowledged,
		id: fileMetadata.id,
	};
}

export const getCurrentDriveIndex = async (database: Db): Promise<number> => {
	const indexCollection = database.collection('index');
	const indexDoc = await indexCollection.findOne({ name: 'currentDriveIndex' });

	if (!indexDoc || typeof indexDoc.currentDriveIndex !== 'number') {
		throw new Error('Failed to retrieve currentDriveIndex from the database');
	}

	return indexDoc.currentDriveIndex;
};

export const incrementDriveIndex = async ({ database, count }: { database: Db | any; count: number }) => {
	let status = false;
	let message = '';
	let currentDriveIndex = 0;

	try {
		if (!database) {
			throw new Error('Database connection is not initialized.');
		}

		const dbCollection = database.collection('index');

		// Ensure the collection exists
		const collections = await database.listCollections({ name: 'index' }).toArray();
		if (collections.length === 0) {
			await database.createCollection('index');
			await dbCollection.insertOne({ name: 'currentDriveIndex', currentDriveIndex: 0 });
			message = 'Index collection and initial document created with currentDriveIndex set to 0.';
			console.log(message);
		}

		// Fetch the document
		let document = await dbCollection.findOne({ name: 'currentDriveIndex' });
		if (!document) {
			await dbCollection.insertOne({ name: 'currentDriveIndex', currentDriveIndex: 0 });
			document = await dbCollection.findOne({ name: 'currentDriveIndex' });
			message = 'Initial document created with currentDriveIndex set to 0.';
			console.log(message);
		}

		if (typeof document.currentDriveIndex !== 'number') {
			throw new Error('currentDriveIndex is not a number.');
		}

		currentDriveIndex = (document.currentDriveIndex + 1) % count;

		await dbCollection.updateOne({ name: 'currentDriveIndex' }, { $set: { currentDriveIndex } });

		status = true;
		message = `Drive index incremented successfully. New index: ${currentDriveIndex}.`;
		console.log(message);
	} catch (error: any) {
		message = `Error: ${error.message}`;
		console.error(message);
		currentDriveIndex = -1; // Indicate an error state
	}

	return { status, currentDriveIndex, message };
};

interface Settings {
	appTitle: string;
	storageClusterName: string;
	[key: string]: any;
}

export const fetchSettings = async (): Promise<{ status: boolean; message: string; settings?: Settings }> => {
	try {
		const db = await connectToMongo();
		const settingsCollection = db.collection('settings');
		const settingsDoc = await settingsCollection.findOne({});

		if (!settingsDoc) {
			throw new Error('Settings document not found.');
		}

		const settings: Settings = {
			appTitle: settingsDoc['app-title'],
			storageClusterName: settingsDoc['storage-cluster-name'],
			...settingsDoc, // Include any other properties
		};

		return { status: true, message: 'Settings retrieved successfully.', settings };
	} catch (error: any) {
		return { status: false, message: `Error fetching settings: ${error.message}` };
	}
};
