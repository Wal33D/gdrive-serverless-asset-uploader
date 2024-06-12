export async function checkIfFileExists({ fileName, folderName, user, db }) {
	const filesCollection = db.collection('files');
	return await filesCollection.findOne({
		fileName,
		folderName, // Check this too if you add it to your MongoDB document
		user,
	});
}
