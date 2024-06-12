export async function findOrCreateNestedFolder(drive: any, path: string[], parentFolderId: string = 'root') {
	let currentParentId = parentFolderId;
	for (const folderName of path) {
		const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${currentParentId}' in parents and trashed=false`;
		let response = await drive.files.list({
			q: query,
			fields: 'files(id, name)',
			spaces: 'drive',
		});

		if (response.data.files.length > 0) {
			currentParentId = response.data.files[0].id; // Folder exists, use this as the next parent
		} else {
			// Folder does not exist, create it
			const fileMetadata = {
				name: folderName,
				mimeType: 'application/vnd.google-apps.folder',
				parents: [currentParentId],
			};
			response = await drive.files.create({
				requestBody: fileMetadata,
				fields: 'id, name',
			});
			currentParentId = response.data.id; // New folder created, use this as the next parent
		}
	}
	return currentParentId; // Return the ID of the last folder in the path
}
