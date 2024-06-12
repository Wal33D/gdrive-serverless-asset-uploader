import { VercelRequest } from '@vercel/node';
import { URL } from 'url'; // Import URL to parse fileUrl

// Function to get user from the request
const getUserFromRequest = (req: VercelRequest): { status: boolean; userName: string } => {
	const userName = req.body?.user || req.query?.user || 'anonymous';
	const status = !!(req.body?.user || req.query?.user);
	return { status, userName };
};

// Function to extract parameters from both the query string and the request body
const extractParams = (req: VercelRequest, key: string) => {
	return req.body?.[key] || req.query?.[key] || undefined;
};

// Helper function to consolidate and check parameters for file URL operations
export const getParamsFromRequest = (req: VercelRequest) => {
	const fileUrl = extractParams(req, 'fileUrl');
	if (!fileUrl) {
		throw new Error('File URL is required but was not provided.');
	}

	let fileName = extractParams(req, 'fileName');
	if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
		try {
			const url = new URL(fileUrl);
			fileName = url.pathname.split('/').pop(); // Extracts the last part of the pathname
		} catch (error) {
			throw new Error('Invalid file URL provided.');
		}
	}

	// Get the user from the request
	const { userName } = getUserFromRequest(req);
	const folderId = extractParams(req, 'folderId') || 'root'; // Default folderId to 'root' if not specified
	const folderName = extractParams(req, 'folderName') || userName; // Default folderName to userName if not specified

	// Status is true only if fileUrl is detected, ensuring the necessity of a file URL for operations
	const status = !!fileUrl;

	return { status, fileUrl, fileName, userName, folderId, folderName };
};
