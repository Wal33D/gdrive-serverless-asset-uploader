import { VercelRequest } from '@vercel/node';

// Function to get user from the request
export const getUserFromRequest = (req: VercelRequest): { status: boolean; userName: string } => {
	const userName = req.body?.user || req.query?.user;
	const status = !!userName;

	if (!status) {
		throw new Error('User name cannot be determined');
	}

	return { status, userName };
};
