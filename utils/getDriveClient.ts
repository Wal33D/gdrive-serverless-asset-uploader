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

	let driveClient: drive_v3.Drive;
	let driveEmail: string;
	let currentIndex: number;

	// Check if overrideEmail is provided
	if (overrideEmail && driveEmails.includes(overrideEmail)) {
		currentIndex = driveEmails.indexOf(overrideEmail);
		driveClient = driveClients[currentIndex] as drive_v3.Drive;
		driveEmail = driveEmails[currentIndex];
	} else {
		// Retrieve the updated currentDriveIndex value
		let { currentDriveIndex } = await incrementDriveIndex({ database, count });
		driveClient = driveClients[currentDriveIndex] as drive_v3.Drive;
		driveEmail = driveEmails[currentDriveIndex];
		currentIndex = currentDriveIndex;
	}

	console.log(`Current Index: ${currentIndex}, Drive Email: ${driveEmail}`);

	return { driveClient, driveIndex: currentIndex, driveEmail };
};
