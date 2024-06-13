import fs from 'fs';
import formidable from 'formidable';
import { drive_v3 } from 'googleapis';

export const formDataUploadToGoogleDrive = async ({
	form,
	fileName,
	folderId,
	drive,
	fileId,
}: {
	form: formidable.IncomingForm;
	fileName: string;
	folderId: string;
	drive: drive_v3.Drive;
	fileId?: string;
}) => {
	const fileMetadata = { name: fileName };

	const formData = await new Promise<{ [key: string]: formidable.File }>((resolve, reject) => {
		form.parse((err, fields, files) => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});

	const file = formData.file as formidable.File;
	const media = { mimeType: file.mimetype, body: fs.createReadStream(file.path) };

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
