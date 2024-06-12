import axios from 'axios';
import { drive_v3 } from 'googleapis';
import { setFilePublic } from '../utils/setFilePublic';
import { getDriveClient } from '../utils/getDriveClient';
import { checkIfFileExists } from '../utils/checkIfFileExists';
import { getParamsFromRequest } from '../utils/getParamsFromRequest';
import { findOrCreateNestedFolder } from '../utils/findOrCreateNestedFolder';
import { FileDocument, RequestParams } from '../types';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToMongo, saveFileRecordToDB } from '../utils/mongo';

async function streamDownloader({
	fileUrl,
	fileName,
	user,
	path,
	setPublic,
	drive,
	ownerEmail,
}: {
	fileUrl: string;
	fileName: string;
	user: string;
	path: string[];
	setPublic: boolean;
	drive: drive_v3.Drive;
	ownerEmail: string;
}): Promise<FileDocument> {
	const response = await axios({
		method: 'get',
		url: fileUrl,
		responseType: 'stream',
	});

	const folderId = await findOrCreateNestedFolder(drive, path);

	const uploadResult = await streamUploadToGoogleDrive({
		fileStream: response.data,
		fileName,
		folderId,
		drive,
	});

	if (setPublic) {
		await setFilePublic(drive, uploadResult.id);
	}

	const fileMetadata = {
		fileName,
		folderId,
		folderName: path.join('/'),
		user,
		ownerEmail,
		...uploadResult,
	};

	return fileMetadata;
}

const streamUploadToGoogleDrive = async ({ fileStream, fileName, folderId, drive }) => {
	const fileMetadata = { name: fileName, parents: [folderId] };
	const media = { mimeType: '*/*', body: fileStream };

	const uploadResponse = await drive.files.create({
		requestBody: fileMetadata,
		media: media,
		fields: 'id, name, mimeType, size, md5Checksum, sha1Checksum, sha256Checksum, starred, trashed, parents, webViewLink, webContentLink, iconLink, createdTime, modifiedTime, quotaBytesUsed, owners(kind,displayName,photoLink,me,permissionId,emailAddress), permissions(id,type,emailAddress,role,displayName,photoLink,deleted)',
	});

	// Generate export download URL
	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return { ...uploadResponse.data, downloadUrl };
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		const database = await connectToMongo();
		const { fileUrl, fileName, folderName, user, setPublic, reUpload, path } = getParamsFromRequest(req) as RequestParams;

		const { exists, document: existingFile } = await checkIfFileExists({ fileName, folderName, user, database });

		if (exists && !reUpload) {
			res.status(200).json({ success: true, ...existingFile });
			return;
		}

		const { driveClient, driveEmail } = await getDriveClient({ database });

		const fileMetadata = await streamDownloader({
			fileUrl,
			fileName,
			user,
			path,
			setPublic,
			drive: driveClient,
			ownerEmail: driveEmail,
		});

		await saveFileRecordToDB(fileMetadata);

		res.status(200).json({ success: true, ...fileMetadata });
	} catch (error) {
		console.error('Failed to upload file:', error);
		res.status(500).json({ success: false, error: error.message });
	}
};

export default handler;
