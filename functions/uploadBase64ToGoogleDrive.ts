import { Readable } from 'stream';
import { VercelRequest } from '@vercel/node';
import { setFilePublic } from '../utils/setFilePublic';
import { getDriveClient } from '../utils/getDriveClient';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { findOrCreateNestedFolder } from '../utils/findOrCreateNestedFolder';
import { streamUploadToGoogleDrive } from './streamDownloader';
import { FileDocument, RequestParams } from '../types';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';

export async function uploadBase64ToGoogleDrive(
	req: VercelRequest
): Promise<{ status: boolean; fileDocument: FileDocument | null; reUpload: boolean; foundInDB: boolean; error?: string }> {
	try {
		const database = await connectToMongo();
		const { base64File, fileName, user, setPublic, reUpload, path } = getParamsFromRequest(req) as RequestParams;

		const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName: path, user, database });

		let driveClient, driveEmail;

		if (exists && reUpload && existingFile) {
			// Use the ownerEmail from the existing file to get the correct drive client
			({ driveClient, driveEmail } = await getDriveClient({ database, overrideEmail: existingFile.ownerEmail }));
		} else {
			// Get a drive client as usual
		}

		const buffer = Buffer.from(base64File, 'base64');
		const fileStream = Readable.from(buffer);

		const folderId = await findOrCreateNestedFolder(driveClient, path);

		const uploadResult = await streamUploadToGoogleDrive({
			fileStream,
			fileName,
			folderId,
			drive: driveClient,
			fileId: reUpload && exists ? existingFile?.id : undefined, // Use existing fileId if reUploading
		});

		if (setPublic) {
			await setFilePublic(driveClient, uploadResult.id);
		}

		const fileMetadata: FileDocument = {
			fileName,
			folderId,
			folderName: path.join('/'),
			user,
			ownerEmail: driveEmail,
			...uploadResult,
		};

		await saveFileRecordToDB(fileMetadata);

		return { status: true, fileDocument: fileMetadata, reUpload: reUpload, foundInDB: exists || false };
	} catch (error) {
		console.error('Failed to upload file:', error);
		return { status: false, fileDocument: null, reUpload: false, foundInDB: false, error: error.message };
	}
}
