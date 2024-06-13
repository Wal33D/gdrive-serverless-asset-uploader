import { VercelRequest, VercelResponse } from '@vercel/node';
import formidable, { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';
import { drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';
import { getDriveClient } from '../utils/getDriveClient';
import { setFilePermissions } from '../utils/setFilePermissions';
import { FileDocument } from '../types';
import { authorizeRequest } from '../utils/auth';
import { checkIfFileExists } from '../utils/checkIfFileExists';

const formDataUploadToGoogleDrive = async ({
	filePath,
	fileName,
	folderId,
	drive,
	fileId,
}: {
	filePath: string;
	fileName: string;
	folderId: string;
	drive: drive_v3.Drive;
	fileId?: string;
}): Promise<any> => {
	const fileMetadata = { name: fileName };
	const media = { mimeType: '*/*', body: fs.createReadStream(filePath) };

	let uploadResponse;
	if (fileId) {
		const existingFile = await drive.files.get({ fileId, fields: 'parents' });
		const previousParents = existingFile.data.parents ? existingFile.data.parents.join(',') : '';

		if (previousParents) {
			await drive.files.update({
				fileId,
				removeParents: previousParents,
			});
		}

		uploadResponse = await drive.files.update({
			fileId,
			addParents: folderId,
			requestBody: fileMetadata,
			media: media,
			fields: 'id, name, mimeType, size, webViewLink, webContentLink',
		});
	} else {
		uploadResponse = await drive.files.create({
			requestBody: { ...fileMetadata, parents: [folderId] },
			media: media,
			fields: 'id, name, mimeType, size, webViewLink, webContentLink',
		});
	}

	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return {
		id: uploadResponse.data.id,
		name: uploadResponse.data.name,
		mimeType: uploadResponse.data.mimeType,
		size: uploadResponse.data.size,
		webViewLink: uploadResponse.data.webViewLink,
		webContentLink: uploadResponse.data.webContentLink,
		downloadUrl,
	};
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		if (req.method === 'GET') {
			res.status(405).json({ status: false, error: 'Method Not Allowed' });
			return;
		}

		await authorizeRequest(req);

		const form = new IncomingForm();
		form.parse(req, async (err: any, fields: Fields, files: Files) => {
			if (err) {
				res.status(400).json({ status: false, error: 'Error parsing form data' });
				return;
			}

			// Log fields and files for debugging
			console.log('Fields:', fields);
			console.log('Files:', files);

			const fileArray = files.file as FormidableFile[];
			if (!fileArray || !fileArray.length) {
				res.status(400).json({ status: false, error: 'File is missing or invalid' });
				return;
			}

			const file = fileArray[0];
			const oldPath = file.filepath;
			const fileName = fields.fileName as string;
			const folderId = (fields.folderId as string) || 'root';
			const setPublic = fields.setPublic === 'true' || fields.setPublic === true;
			const reUpload = fields.reUpload === 'true' || fields.reUpload === true;
			const shareEmails = Array.isArray(fields.shareEmails) ? fields.shareEmails : fields.shareEmails ? [fields.shareEmails] : [];
			const user = (fields.user as string) || 'anonymous';

			const database = await connectToMongo();
			const { driveClient: drive } = await getDriveClient({ database });

			const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName: [user, folderId], user, database });

			const fileDocument: FileDocument = await formDataUploadToGoogleDrive({
				filePath: oldPath,
				fileName,
				folderId,
				drive,
				fileId: reUpload && exists ? existingFile?.id : undefined,
			});

			if (setPublic || (shareEmails && shareEmails.length > 0)) {
				await setFilePermissions({ drive, fileId: fileDocument.id, setPublic, shareEmails });
			}

			await saveFileRecordToDB(fileDocument);

			res.status(200).json({ status: true, fileDocument });
		});
	} catch (error) {
		console.error('Failed to upload file:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
