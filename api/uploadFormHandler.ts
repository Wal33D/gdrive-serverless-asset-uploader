import fs from 'fs';
import { File } from 'formidable';
import { drive_v3 } from 'googleapis';
import { getMimeType } from '../utils/getMimeTypes';
import { FileDocument } from '../types';
import { IncomingForm } from 'formidable';
import { getDriveClient } from '../utils/getDriveClient';
import { authorizeRequest } from '../utils/auth';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { setFilePermissions } from '../utils/setFilePermissions';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';

const fields =
	'id, name, mimeType, size, md5Checksum, starred, trashed, parents, iconLink, createdTime, modifiedTime, webViewLink, webContentLink, owners(kind,permissionId,emailAddress), permissions(id,emailAddress,role)';

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
	const mimeType = getMimeType(fileName);
	const fileMetadata = { name: fileName };
	const media = { mimeType, body: fs.createReadStream(filePath) };

	const request = fileId
		? drive.files.update({
				fileId,
				addParents: folderId,
				removeParents: (await drive.files.get({ fileId, fields: 'parents' })).data.parents?.join(','),
				requestBody: fileMetadata,
				media,
				fields,
		  })
		: drive.files.create({
				requestBody: { ...fileMetadata, parents: [folderId] },
				media,
				fields,
		  });

	const uploadResponse = await request;
	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return { ...uploadResponse.data, downloadUrl };
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
	if (req.method === 'GET') {
		res.status(405).json({ status: false, error: 'Method Not Allowed' });
		return;
	}

	try {
		await authorizeRequest(req);

		const form = new IncomingForm();
		form.parse(req, async (err, fields, files) => {
			if (err) return res.status(400).json({ status: false, error: 'Error parsing form data' });

			const fileArray = files.file as File[];
			if (!fileArray || !fileArray.length) return res.status(400).json({ status: false, error: 'File is missing or invalid' });

			const fileNames = Array.isArray(fields.fileName) ? fields.fileName : [fields.fileName];
			const folderId = fields.folderId?.[0] || 'root';
			const setPublic = fields.setPublic?.[0] === 'true';
			const reUpload = fields.reUpload?.[0] === 'true';
			const shareEmails = Array.isArray(fields.shareEmails) ? fields.shareEmails : fields.shareEmails ? [fields.shareEmails[0]] : [];
			const user = fields.user?.[0] || 'anonymous';

			const database = await connectToMongo();
			const { driveClient: drive } = await getDriveClient({ database });

			const uploadPromises = fileArray.map(async (file, i) => {
				const fileName = fileNames[i] || file.originalFilename;

				if (!fileName) {
					throw new Error('File name is missing, cannot proceed with the upload.');
				}

				let existingFile: any = undefined;
				let exists = false;

				const result = await checkIfFileExists({ fileName, folderName: [user, folderId], user, database });
				existingFile = result.document;
				exists = result.exists;

				const fileDocument: FileDocument = await formDataUploadToGoogleDrive({
					filePath: file.filepath,
					fileName,
					folderId,
					drive,
					fileId: reUpload && exists ? existingFile?.id : undefined,
				});

				if (setPublic || shareEmails.length) {
					await setFilePermissions({ drive, fileId: fileDocument.id, setPublic, shareEmails });
				}

				await saveFileRecordToDB(fileDocument);
				return fileDocument;
			});

			const uploadResults = await Promise.all(uploadPromises);
			res.status(200).json({ status: true, files: uploadResults });
		});
	} catch (error) {
		console.error('Failed to upload file:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
