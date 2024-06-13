import { authorizeRequest } from '../utils/auth';
import { handleGetRequest } from '../functions/handleGetRequest';
import { streamToGoogleFromUrl } from '../functions/streamToGoogleFromUrl';
import { uploadBase64ToGoogleDrive } from '../functions/uploadBase64ToGoogleDrive';
import { uploadFormDataToGoogleDrive } from '../functions/uploadFormDataToGoogleDrive';
import { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';

const handler = async (req: VercelRequest, res: VercelResponse) => {
	try {
		if (req.method === 'GET') {
			await handleGetRequest({ request: req, response: res });
			return;
		}

		await authorizeRequest(req);

		const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
		const base64File = req.body?.base64File || req.query?.base64File;
		const contentType = req.headers['content-type'];

		if (base64File && typeof base64File === 'string') {
			const result = await uploadBase64ToGoogleDrive(req);
			res.status(result.status ? 200 : 500).json(result);
		} else if (fileUrl && typeof fileUrl === 'string') {
			const result = await streamToGoogleFromUrl(req);
			res.status(result.status ? 200 : 500).json(result);
		} else if (contentType?.includes('multipart/form-data')) {
			const form = new formidable.IncomingForm();
			form.parse(req, async (err, fields, files) => {
				if (err) {
					res.status(500).json({ status: false, error: 'Failed to parse form data' });
					return;
				}
				req.body = fields;
				req.body.file = files.file;
				const result = await uploadFormDataToGoogleDrive(req);
				res.status(result.status ? 200 : 500).json(result);
			});
		} else {
			res.status(400).json({ status: false, error: 'Invalid or missing fileUrl, base64File, or form-data parameter' });
		}
	} catch (error) {
		console.error('Failed to process request:', error);
		res.status(500).json({ status: false, error: error.message });
	}
};

export default handler;
