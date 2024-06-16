import { VercelRequest, VercelResponse } from '@vercel/node';
import { drive_v3 } from 'googleapis';
import { getDriveClient } from '../utils/getDriveClient';
import { authorizeRequest } from '../utils/auth';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';
import { setFilePermissions } from '../utils/setFilePermissions';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { FileDocument } from '../types';
import Busboy from 'busboy';
import { PassThrough } from 'stream';

const formDataUploadToGoogleDrive = async ({
	stream,
	fileName,
	folderId,
	drive,
	fileId,
}: {
	stream: NodeJS.ReadableStream;
	fileName: string;
	folderId: string;
	drive: drive_v3.Drive;
	fileId?: string;
}): Promise<any> => {
	const fileMetadata = { name: fileName };
	const media = { mimeType: '*/*', body: stream };

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
		if (req.method !== 'POST') {
			res.status(405).json({ status: false, error: 'Method Not Allowed' });
			return;
		}

		await authorizeRequest(req);

		const busboy = new Busboy({ headers: req.headers });
		const uploadResults: any[] = [];
		let fields: any = {};
		const streams: { stream: NodeJS.ReadableStream; fileName: string }[] = [];

		busboy.on('field', (fieldname, val) => {
			fields[fieldname] = val;
		});

		busboy.on('file', (fieldname, file, filename) => {
			const passThrough = new PassThrough();
			file.pipe(passThrough);
			streams.push({ stream: passThrough, fileName: filename });
		});

		busboy.on('finish', async () => {
			const fileNames = Array.isArray(fields.fileName) ? fields.fileName : [fields.fileName];
			const folderId = fields.folderId || 'root';
			const setPublic = fields.setPublic === 'true';
			const reUpload = fields.reUpload === 'true';
			const shareEmails = Array.isArray(fields.shareEmails) ? fields.shareEmails : fields.shareEmails ? [fields.shareEmails] : [];
			const user = fields.user || 'anonymous';

			const database = await connectToMongo();
			const { driveClient: drive } = await getDriveClient({ database });

			for (let i = 0; i < streams.length; i++) {
				const { stream, fileName } = streams[i];
				const actualFileName = fileNames[i] || fileName;

				const { exists, document: existingFile } = await checkIfFileExists({
					fileName: actualFileName,
					folderName: [user, folderId],
					user,
					database,
				});

				const fileDocument: FileDocument = await formDataUploadToGoogleDrive({
					stream,
					fileName: actualFileName,
					folderId,
					drive,
					fileId: reUpload && exists ? existingFile?.id : undefined,
				});

				if (setPublic || (shareEmails && shareEmails.length > 0)) {
					await setFilePermissions({ drive, fileId: fileDocument.id, setPublic, shareEmails });
				}

				await saveFileRecordToDB(fileDocument);
				uploadResults.push(fileDocument);
			}

			res.status(200).json({ status: true, files: uploadResults });
		});

		req.pipe(busboy);
	} catch (error) {
		console.error('Failed to upload file:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
