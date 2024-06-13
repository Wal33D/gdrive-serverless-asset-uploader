import { VercelRequest } from '@vercel/node';
import { getDriveClient } from '../utils/getDriveClient';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { setFilePermissions } from '../utils/setFilePermissions';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { base64UploadToGoogleDrive } from '../utils/base64UploadToGoogleDrive';
import { FileDocument, RequestParams } from '../types';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';

export async function uploadBase64ToGoogleDrive(
	req: VercelRequest
): Promise<{ status: boolean; fileDocument: FileDocument | null; reUpload: boolean; foundInDB: boolean; error?: string }> {
	try {
		const database = await connectToMongo();
		const { base64File, fileName, user, setPublic, reUpload, path, folderId, shareEmails } = getParamsFromRequest(req) as RequestParams;

		const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName: path, user, database });

		let driveClient, driveEmail;

		if (exists && reUpload && existingFile) {
			// Use the ownerEmail from the existing file to get the correct drive client
			({ driveClient, driveEmail } = await getDriveClient({ database, overrideEmail: existingFile.ownerEmail }));
		} else if (exists && !reUpload && existingFile) {
			return { status: true, fileDocument: existingFile, reUpload: reUpload, foundInDB: exists };
		} else {
			// Get a drive client as usual
			({ driveClient, driveEmail } = await getDriveClient({ database }));
		}

		// Pass the existing fileId if reUploading
		const fileDocument: FileDocument = await base64UploadToGoogleDrive({
			base64File,
			fileName,
			folderId,
			drive: driveClient,
			fileId: reUpload && exists ? existingFile?.id : undefined, // Use existing fileId if reUploading
		});

		if (setPublic || (shareEmails && shareEmails.length > 0)) {
			await setFilePermissions({ drive: driveClient, fileId: fileDocument.id, setPublic, shareEmails });
		}

		await saveFileRecordToDB(fileDocument);

		return { status: true, fileDocument, reUpload: reUpload, foundInDB: exists || false };
	} catch (error) {
		console.error('Failed to upload file:', error);
		return { status: false, fileDocument: null, reUpload: false, foundInDB: false, error: error.message };
	}
}
