import { FileDocument } from './checkIfFileExists';
import { MongoClient, Db } from 'mongodb';

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
		const indexExists = await indexCollection.countDocuments({ name: 'driveIndex' });
		if (indexExists === 0) {
			await indexCollection.insertOne({ name: 'driveIndex', currentDriveIndex: 0 });
		}
	}
	return db as Db;
};

export async function saveFileRecordToDB(fileMetadata: FileDocument): Promise<{ status: boolean; id: string }> {
	if (!db) {
		throw new Error('Database is not connected. Ensure connectToMongo is called before.');
	}

	const filesCollection = db.collection<FileDocument>('files');
	const insertResult = await filesCollection.insertOne(fileMetadata);

	return {
		status: insertResult.acknowledged,
		id: insertResult.insertedId.toString(),
	};
}
