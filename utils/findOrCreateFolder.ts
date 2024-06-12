export const findOrCreateFolder = async (drive: any, folderName: string, parentFolderId: string = 'root') => {
	// Search for the folder
	const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;
	const response = await drive.files.list({
		q: query,
		fields: 'files(id, name)',
	});

	const folders = response.data.files;
	if (folders.length > 0) {
		// Folder exists
		return { folderName: folders[0].name, folderId: folders[0].id };
	} else {
		// Folder does not exist, create it
		const fileMetadata = {
			name: folderName,
			mimeType: 'application/vnd.google-apps.folder',
			parents: [parentFolderId],
		};

		const folder = await drive.files.create({
			resource: fileMetadata,
			fields: 'id, name',
		});

		return { folderName: folder.data.name, folderId: folder.data.id };
	}
};
