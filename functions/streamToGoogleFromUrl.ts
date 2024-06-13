import { VercelRequest } from '@vercel/node';
import { getDriveClient } from '../utils/getDriveClient';
import { streamDownloader } from '../functions/streamDownloader';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { FileDocument, RequestParams } from '../types';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';
import { setFilePermissions } from '../utils/setFilePermissions';

export async function streamToGoogleFromUrl(
	req: VercelRequest
): Promise<{ status: boolean; fileDocument: FileDocument | null; reUpload: boolean; foundInDB: boolean; error?: string }> {
	try {
		const database = await connectToMongo();
		const { fileUrl, fileName, user, setPublic, reUpload, path, shareEmails } = getParamsFromRequest(req) as RequestParams;

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
		const fileDocument: FileDocument = await streamDownloader({
			fileUrl,
			fileName,
			user,
			path,
			drive: driveClient,
			ownerEmail: driveEmail,
			fileId: reUpload && exists ? existingFile?.id : undefined, // Use existing fileId if reUploading
		});

		if (setPublic) {
			await setFilePermissions({ drive: driveClient, fileId: fileDocument.id, shareEmails: shareEmails || undefined });
		}

		await saveFileRecordToDB(fileDocument);

		return { status: true, fileDocument, reUpload: reUpload, foundInDB: exists || false };
	} catch (error) {
		console.error('Failed to upload file:', error);
		return { status: false, fileDocument: null, reUpload: false, foundInDB: false, error: error.message };
	}
}
