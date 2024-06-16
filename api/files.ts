import { connectToMongo } from '../utils/mongo';
import { authorizeRequest } from '../utils/auth';
import { VercelRequest, VercelResponse } from '@vercel/node';

const searchFiles = async (query: any) => {
	const db = await connectToMongo();
	const filesCollection = db.collection('files');

	const searchQuery: any = {};

	if (query.fileName) searchQuery.name = query.name;
	if (query.folderId) searchQuery.folderId = query.folderId;
	if (query.folderName) searchQuery.folderName = query.folderName;
	if (query.user) searchQuery.user = query.user;
	if (query.ownerEmail) searchQuery.ownerEmail = query.ownerEmail;
	if (query.id) searchQuery.id = query.id;
	if (query.name) searchQuery.name = query.name;
	if (query.mimeType) searchQuery.mimeType = query.mimeType;
	if (query.starred !== undefined) searchQuery.starred = query.starred === 'true';
	if (query.trashed !== undefined) searchQuery.trashed = query.trashed === 'true';
	if (query.parents) searchQuery.parents = { $in: [query.parents] };
	if (query.createdTime) searchQuery.createdTime = { $gte: new Date(query.createdTime) };
	if (query.modifiedTime) searchQuery.modifiedTime = { $gte: new Date(query.modifiedTime) };
	if (query.permissions) searchQuery.permissions = { $elemMatch: { emailAddress: query.permissions } };
	if (query.md5Checksum) searchQuery.md5Checksum = query.md5Checksum;
	if (query.size) searchQuery.size = query.size;

	const files = await filesCollection.find(searchQuery).toArray();
	return files;
};

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	try {
		await authorizeRequest(req);

		// Ensure body is parsed correctly if Content-Type is application/json
		let bodyParams = {};
		if (req.headers['content-type'] === 'application/json') {
			bodyParams = req.body;
		} else if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
			bodyParams = Object.fromEntries(new URLSearchParams(req.body).entries());
		}

		// Combine query params and body params into a single object
		const searchParams = { ...req.query, ...bodyParams };

		const files = await searchFiles(searchParams);
		res.status(200).json({
			data: {
				status: true,
				files,
			},
		});
	} catch (error) {
		console.error('Error fetching files:', error);
		res.status(500).json({
			data: {
				status: false,
				error: 'Failed to fetch files',
				details: (error as Error).message,
			},
		});
	}
}

export default handler;
