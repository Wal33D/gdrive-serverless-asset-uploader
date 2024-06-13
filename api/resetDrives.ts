import { drive_v3 } from 'googleapis';
import { connectToMongo } from '../utils/mongo';
import { authorizeRequest } from '../utils/auth';
import { getServiceAccountClients } from '../utils/getServiceAccountClients';
import { VercelRequest, VercelResponse } from '@vercel/node';

const resetDrives = async () => {
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	await authorizeRequest(req);

	try {
		const result = await resetDrives();
		res.status(200).json({
			data: {
				status: result.status,
				message: result.message,
			},
		});
	} catch (error) {
		console.error('Error resetting drives:', error);
		res.status(500).json({
			data: {
				status: false,
				error: 'Failed to reset drives',
				details: (error as Error).message,
			},
		});
	}
}
