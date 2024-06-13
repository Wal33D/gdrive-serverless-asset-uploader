import { VercelRequest } from '@vercel/node';
import formidable from 'formidable';
import { getDriveClient } from '../utils/getDriveClient';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { setFilePermissions } from '../utils/setFilePermissions';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { formDataUploadToGoogleDrive } from '../functions/formDataUploadToGoogleDrive';
import { FileDocument, RequestParams } from '../types';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';

export async function uploadFormDataToGoogleDrive(
	req: VercelRequest,
	formData: { fields: formidable.Fields; files: formidable.Files }
): Promise<{ status: boolean; fileDocument: FileDocument | null; reUpload: boolean; foundInDB: boolean; error?: string }> {
	try {
		const database = await connectToMongo();
		const { fileName, user, setPublic, reUpload, path, folderId, shareEmails } = getParamsFromRequest(formData.fields) as RequestParams;

		const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName: path, user, database });

		let driveClient, driveEmail;

		if (exists && reUpload && existingFile) {
			({ driveClient, driveEmail } = await getDriveClient({ database, overrideEmail: existingFile.ownerEmail }));
		} else if (exists && !reUpload && existingFile) {
			return { status: true, fileDocument: existingFile, reUpload: reUpload, foundInDB: exists };
		} else {
			({ driveClient, driveEmail } = await getDriveClient({ database }));
		}

		const file = formData.files.file as formidable.File;
		const fileDocument: FileDocument = await formDataUploadToGoogleDrive({
			formData,
			fileName,
			folderId,
			drive: driveClient,
			fileId: reUpload && exists ? existingFile?.id : undefined,
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
