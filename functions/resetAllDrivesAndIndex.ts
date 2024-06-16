import { drive_v3 } from 'googleapis';
import { connectToMongo } from '../utils/mongo';
import { getServiceAccountClients } from '../utils/getServiceAccountClients';

export const resetAllDrivesAndIndex = async () => {
	const { driveClients } = await getServiceAccountClients();

	for (const drive of driveClients) {
		const listParams: drive_v3.Params$Resource$Files$List = {
			q: "'root' in parents and trashed = false",
			fields: 'files(id, name)',
			spaces: 'drive',
		};

		const fileList = await drive.files.list(listParams);
		const files = fileList.data.files || [];

		for (const file of files) {
			if (file.id) {
				await drive.files.delete({ fileId: file.id });
			}
		}
	}

	const db = await connectToMongo();

	const filesCollection = db.collection('files');
	const indexCollection = db.collection('index');

	await filesCollection.deleteMany({});
	await indexCollection.deleteMany({});

	await indexCollection.insertOne({ name: 'currentDriveIndex', currentDriveIndex: 1 });

	return { status: true, message: 'All drives and database entries have been reset successfully.' };
};
