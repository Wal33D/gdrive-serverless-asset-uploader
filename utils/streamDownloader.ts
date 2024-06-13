import axios from 'axios';
import { drive_v3 } from 'googleapis';
import { FileDocument } from '../types';
import { setFilePublic } from '../utils/setFilePublic';
import { findOrCreateNestedFolder } from '../utils/findOrCreateNestedFolder';

export async function streamDownloader({
	fileUrl,
	fileName,
	user,
	path,
	setPublic,
	drive,
	ownerEmail,
	fileId, // Optional fileId for updating an existing file
}: {
	fileUrl: string;
	fileName: string;
	user: string;
	path: string[];
	setPublic: boolean;
	drive: drive_v3.Drive;
	ownerEmail: string;
	fileId?: string;
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
		fileId, // Pass the fileId for updating if it exists
	});

	if (setPublic) {
		await setFilePublic(drive, uploadResult.id);
	}

	const fileMetadata: FileDocument = {
		fileName,
		folderId,
		folderName: path.join('/'),
		user,
		ownerEmail,
		...uploadResult,
	};

	return fileMetadata;
}

const streamUploadToGoogleDrive = async ({
	fileStream,
	fileName,
	folderId,
	drive,
	fileId,
}: {
	fileStream: any;
	fileName: string;
	folderId: string;
	drive: drive_v3.Drive;
	fileId?: string;
}) => {
	const fileMetadata = { name: fileName };
	const media = { mimeType: '*/*', body: fileStream };

	let uploadResponse;
	if (fileId) {
		// Get the current parents of the file
		const existingFile = await drive.files.get({ fileId, fields: 'parents' });
		const previousParents = existingFile.data.parents ? existingFile.data.parents.join(',') : '';

		// Remove the previous parents
		if (previousParents) {
			await drive.files.update({
				fileId,
				removeParents: previousParents,
			});
		}

		// Update existing file
		uploadResponse = await drive.files.update({
			fileId,
			addParents: folderId,
			requestBody: fileMetadata,
			media: media,
			fields: 'id, name, mimeType, size, md5Checksum, sha1Checksum, sha256Checksum, starred, trashed, parents, webViewLink, webContentLink, iconLink, createdTime, modifiedTime, quotaBytesUsed, owners(kind,displayName,photoLink,me,permissionId,emailAddress), permissions(id,type,emailAddress,role,displayName,photoLink,deleted)',
		});
	} else {
		// Create new file
		uploadResponse = await drive.files.create({
			requestBody: { ...fileMetadata, parents: [folderId] },
			media: media,
			fields: 'id, name, mimeType, size, md5Checksum, sha1Checksum, sha256Checksum, starred, trashed, parents, webViewLink, webContentLink, iconLink, createdTime, modifiedTime, quotaBytesUsed, owners(kind,displayName,photoLink,me,permissionId,emailAddress), permissions(id,type,emailAddress,role,displayName,photoLink,deleted)',
		});
	}

	// Generate export download URL
	const downloadUrl = `https://drive.google.com/uc?id=${uploadResponse.data.id}&export=download`;

	return { ...uploadResponse.data, downloadUrl };
};
