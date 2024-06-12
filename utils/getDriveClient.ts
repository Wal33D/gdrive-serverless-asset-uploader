import { Db } from 'mongodb';
import { drive_v3 } from 'googleapis';
import { getServiceAccountClients } from './getServiceAccountClients';

interface DriveClientResponse {
	driveClient: drive_v3.Drive;
	driveIndex: number;
	driveEmail: string;
}

export const getDriveClient = async ({ database }: { database: Db }): Promise<DriveClientResponse> => {
	const indexCollection = database.collection('index');
	const { driveClients, driveEmails, count } = await getServiceAccountClients();

	// Initialize the drive index if it does not exist
	const indexDoc: any = await indexCollection.findOneAndUpdate(
		{ name: 'driveIndex' },
		{ $inc: { currentDriveIndex: 1 } },
		{ returnDocument: 'after', upsert: true }
	);

	let currentDriveIndex = indexDoc.value?.currentDriveIndex;

	if (!currentDriveIndex) {
		currentDriveIndex = 1;
		await indexCollection.insertOne({ name: 'driveIndex', currentDriveIndex });
	}

	// Ensure the index wraps around correctly
	const currentIndex = (currentDriveIndex - 1) % count;

	// Update the index in the database if needed
	if (currentIndex !== currentDriveIndex - 1) {
		await indexCollection.updateOne({ name: 'driveIndex' }, { $set: { currentDriveIndex: currentIndex + 1 } });
	}

	const driveClient = driveClients[currentIndex] as drive_v3.Drive;
	const driveEmail = driveEmails[currentIndex];

	return { driveClient, driveIndex: currentIndex, driveEmail };
};
