import { Db } from 'mongodb';
import { drive_v3 } from 'googleapis';
import { getServiceAccountClients } from './getServiceAccountClients';
import { incrementDriveIndex } from './mongo';

interface DriveClientResponse {
	driveClient: drive_v3.Drive;
	driveIndex: number;
	driveEmail: string;
}

export const getDriveClient = async ({ database, overrideEmail }: { database: Db; overrideEmail?: string }): Promise<DriveClientResponse> => {
	const { driveClients, driveEmails, count } = await getServiceAccountClients();

	let driveClient: drive_v3.Drive | undefined;
	let driveEmail: string | undefined;
	let currentIndex: number | undefined;

	// Check if overrideEmail is provided
	if (overrideEmail && driveEmails.includes(overrideEmail)) {
		currentIndex = driveEmails.indexOf(overrideEmail);
		driveClient = driveClients[currentIndex] as drive_v3.Drive;
		driveEmail = driveEmails[currentIndex];
	} else {
		let driveFound = false;

		do {
			// Retrieve the updated currentDriveIndex value
			let { currentDriveIndex } = await incrementDriveIndex({ database, count });
			driveClient = driveClients[currentDriveIndex] as drive_v3.Drive;
			driveEmail = driveEmails[currentDriveIndex];
			currentIndex = currentDriveIndex;

			// Get the drive usage
			const usage = await getDriveUsage(driveClient);
			const totalSpaceMB = 14 * 1024; // 14 GB in MB

			if (usage.totalUsed <= totalSpaceMB) {
				driveFound = true;
			}
		} while (!driveFound);
	}

	if (!driveClient || !driveEmail || currentIndex === undefined) {
		throw new Error('Failed to find a suitable drive');
	}

	console.log(`Current Index: ${currentIndex}, Drive Email: ${driveEmail}`);

	return { driveClient, driveIndex: currentIndex, driveEmail };
};

const getDriveUsage = async (drive: drive_v3.Drive): Promise<{ totalUsed: number }> => {
	const listParams: drive_v3.Params$Resource$Files$List = {
		q: 'trashed = false',
		fields: 'files(size)',
		spaces: 'drive',
	};

	let totalUsed = 0;
	let pageToken: string | undefined = undefined;

	do {
		const fileList = await drive.files.list({
			...listParams,
			pageToken: pageToken || undefined,
		});
		const files = fileList.data.files || [];
		totalUsed += files.reduce((sum, file) => sum + (file.size ? parseInt(file.size, 10) : 0), 0);
		pageToken = fileList.data.nextPageToken || undefined;
	} while (pageToken);

	return { totalUsed: totalUsed / (1024 * 1024) }; // Convert to MB
};
