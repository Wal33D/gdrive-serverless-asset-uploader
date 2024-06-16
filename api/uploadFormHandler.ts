import fs from 'fs';
import { drive_v3 } from 'googleapis';
import { FileDocument } from '../types';
import { getDriveClient } from '../utils/getDriveClient';
import { authorizeRequest } from '../utils/auth';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { setFilePermissions } from '../utils/setFilePermissions';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';
import { IncomingForm, Fields, Files, File as FormidableFile } from 'formidable';

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
			fields: 'id, name, mimeType, size, md5Checksum, sha1Checksum, sha256Checksum, starred, trashed, parents, webViewLink, webContentLink, iconLink, createdTime, modifiedTime, quotaBytesUsed, owners(kind,displayName,photoLink,me,permissionId,emailAddress), permissions(id,type,emailAddress,role,displayName,photoLink,deleted)',
		});
	} else {
		uploadResponse = await drive.files.create({
			requestBody: { ...fileMetadata, parents: [folderId] },
			media: media,
			fields: 'id, name, mimeType, size, md5Checksum, sha1Checksum, sha256Checksum, starred, trashed, parents, webViewLink, webContentLink, iconLink, createdTime, modifiedTime, quotaBytesUsed, owners(kind,displayName,photoLink,me,permissionId,emailAddress), permissions(id,type,emailAddress,role,displayName,photoLink,deleted)',
		});
	}

	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return {
		...uploadResponse.data,
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

			const fileNames = Array.isArray(fields.fileName) ? fields.fileName : [fields.fileName];
			const folderId = (fields.folderId && fields.folderId[0]) || 'root';
			const setPublic = fields.setPublic && fields.setPublic[0] === 'true';
			const reUpload = fields.reUpload && fields.reUpload[0] === 'true';
			const shareEmails = Array.isArray(fields.shareEmails) ? fields.shareEmails : fields.shareEmails ? [fields.shareEmails[0]] : [];
			const user = (fields.user && fields.user[0]) || 'anonymous';

			const database = await connectToMongo();
			const { driveClient: drive } = await getDriveClient({ database });

			const uploadPromises = fileArray.map(async (file, i) => {
				const oldPath = file.filepath;
				const fileName = fileNames[i] || file.originalFilename;
				//@ts-ignore
				const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName: [user, folderId], user, database });

				const fileDocument: FileDocument = await formDataUploadToGoogleDrive({
					filePath: oldPath,
					//@ts-ignore
					fileName,
					folderId,
					drive,
					fileId: reUpload && exists ? existingFile?.id : undefined,
				});

				if (setPublic || (shareEmails && shareEmails.length > 0)) {
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
