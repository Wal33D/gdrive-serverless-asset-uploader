import { authorizeRequest } from '../utils/auth';
import { handleGetRequest } from '../functions/handleGetRequest';
import { handleFormDataRequest } from '../functions/uploadFormHandler';
import { streamToGoogleFromUrl } from '../functions/streamToGoogleFromUrl';
import { uploadBase64ToGoogleDrive } from '../functions/uploadBase64ToGoogleDrive';
import { resetAllDrivesAndIndex } from '../functions/resetAllDrivesAndIndex';
import { VercelRequest, VercelResponse } from '@vercel/node';

const formatFileDocument = (fileDocument: any) => ({
	id: fileDocument.id,
	name: fileDocument.name,
	size: fileDocument.size,
	mimeType: fileDocument.mimeType,
	iconLink: fileDocument.iconLink,
	downloadUrl: fileDocument.downloadUrl,
	webViewLink: fileDocument.webViewLink,
	md5Checksum: fileDocument.md5Checksum,
	createdTime: fileDocument.createdTime,
	modifiedTime: fileDocument.modifiedTime,
	starred: fileDocument.starred,
	trashed: fileDocument.trashed,
	parents: fileDocument.parents,
	owners: fileDocument.owners.map((owner: any) => ({ emailAddress: owner.emailAddress })),
});

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		if (req.method === 'GET') {
			await handleGetRequest({ request: req, response: res });
			return;
		}

		await authorizeRequest(req);

		if (req.method === 'DELETE') {
			const result = await resetAllDrivesAndIndex();
			res.status(result.status ? 200 : 500).json(result);
			return;
		}

		const contentType = req.headers['content-type'];
		if (contentType && contentType.includes('multipart/form-data')) {
			const result = await handleFormDataRequest(req);
			const formattedResult = {
				...result,
				files: result.files.map(formatFileDocument),
			};
			res.status(result.status ? 200 : 500).json(formattedResult);
			return;
		}

		const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
		const base64File = req.body?.base64File || req.query?.base64File;

		if (base64File && typeof base64File === 'string') {
			const result = await uploadBase64ToGoogleDrive(req);
			const formattedResult = {
				...result,
				fileDocument: formatFileDocument(result.fileDocument),
			};
			res.status(result.status ? 200 : 500).json(formattedResult);
		} else if (fileUrl && typeof fileUrl === 'string') {
			const result = await streamToGoogleFromUrl(req);
			const formattedResult = {
				...result,
				fileDocument: formatFileDocument(result.fileDocument),
			};
			res.status(result.status ? 200 : 500).json(formattedResult);
		} else {
			res.status(400).json({ status: false, error: 'Invalid or missing fileUrl or base64File parameter' });
		}
	} catch (error) {
		console.error('Failed to process request:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
