import fs from 'fs';
import { File } from 'formidable';
import { drive_v3 } from 'googleapis';
import { getMimeType } from '../utils/getMimeTypes';
import { FileDocument } from '../types';
import { IncomingForm } from 'formidable';
import { VercelRequest } from '@vercel/node';
import { getDriveClient } from '../utils/getDriveClient';
import { authorizeRequest } from '../utils/auth';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { setFilePermissions } from '../utils/setFilePermissions';
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

export const handleFormDataRequest = async (req: VercelRequest): Promise<any> => {
	if (req.method === 'GET') {
		return { status: false, error: 'Method Not Allowed' };
	}

	try {
		await authorizeRequest(req);

		const contentType = req.headers['content-type'];
		if (contentType && contentType.includes('multipart/form-data')) {
			console.log('Request contains form-data');
		} else {
			console.log('Request does not contain form-data');
		}

		return new Promise((resolve, reject) => {
			const form = new IncomingForm();
			form.parse(req, async (err, fields, files) => {
				if (err) {
					resolve({ status: false, error: 'Error parsing form data' });
					return;
				}

				const fileArray = files.file as File[];
				if (!fileArray || !fileArray.length) {
					resolve({ status: false, error: 'File is missing or invalid' });
					return;
				}

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

					const result = await checkIfFileExists({ fileName, folderName: [user, folderId], user, database });
					const existingFile = result.document;
					const exists = result.exists;

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
				resolve({ status: true, files: uploadResults });
			});
		});
	} catch (error) {
		console.error('Failed to upload file:', error);
		return { status: false, error: error.message };
	}
};
