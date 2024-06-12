import { Db } from 'mongodb';
import { FileDocument, FileExistsResponse } from '../types';

export async function checkIfFileExists({
	fileName,
	folderName,
	user,
	database,
}: {
	fileName: string;
	folderName: string;
	user: string;
	database: Db;
}): Promise<FileExistsResponse> {
	const filesCollection = database.collection<FileDocument>('files');
	const document = await filesCollection.findOne({
		fileName,
		folderName,
		user,
	});

	return {
		exists: !!document,
		document: document || undefined,
	};
}
export { FileDocument };
