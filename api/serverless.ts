import { authorizeRequest } from '../utils/auth';
import { handleGetRequest } from '../functions/handleGetRequest';
import { streamToGoogleFromUrl } from '../functions/streamToGoogleFromUrl';
import { uploadBase64ToGoogleDrive } from '../functions/uploadBase64ToGoogleDrive';
import { VercelRequest, VercelResponse } from '@vercel/node';

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		if (req.method === 'GET') {
			await handleGetRequest({ request: req, response: res });
			return;
		}

		await authorizeRequest(req);

		const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
		const base64File = req.body?.base64File || req.query?.base64File;

		if (base64File && typeof base64File === 'string') {
			const result = await uploadBase64ToGoogleDrive(req);
			res.status(result.status ? 200 : 500).json(result);
		} else if (fileUrl && typeof fileUrl === 'string') {
			const result = await streamToGoogleFromUrl(req);
			res.status(result.status ? 200 : 500).json(result);
		} else {
			res.status(400).json({ status: false, error: 'Invalid or missing fileUrl or base64File parameter' });
		}
	} catch (error) {
		console.error('Failed to process request:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
