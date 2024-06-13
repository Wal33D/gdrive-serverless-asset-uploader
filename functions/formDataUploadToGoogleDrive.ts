import { IncomingForm } from 'formidable';
import { drive_v3 } from 'googleapis';
import fs from 'fs';

export const formDataUploadToGoogleDrive = async ({
	formData,
	fileName,
	folderId,
	drive,
	fileId,
}: {
	formData: IncomingForm;
	fileName: string;
	folderId: string;
	drive: drive_v3.Drive;
	fileId?: string;
}) => {
	const fileMetadata = { name: fileName };

	formData = await new Promise<{ [key: string]: IncomingForm.File }>((resolve, reject) => {
		formData.parse((err, fields, files) => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});

	const file = formData.file as IncomingForm.File;
	const media = { mimeType: file.mimetype, body: fs.createReadStream(file.filepath) };

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
