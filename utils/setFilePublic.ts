import { drive_v3 } from 'googleapis';

// Helper function to set the uploaded file to public
export const setFilePublic = async (drive: drive_v3.Drive, fileId: string): Promise<void> => {
	await drive.permissions.create({
		fileId,
		requestBody: { type: 'anyone', role: 'reader' },
	});
};
