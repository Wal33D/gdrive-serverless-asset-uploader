import jwt from 'jsonwebtoken';
import { decrypt } from './decrypt';
import { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';

export const authorizeRequest = (req: VercelRequest): void => {
	const token = req.headers.authorization?.split(' ')[1];

	if (!token) {
		throw new Error('Missing token');
	}

	if (!JWT_SECRET) {
		throw new Error('Server configuration error: Missing JWT_SECRET');
	}

	try {
		const decryptedToken = decrypt(token);
		jwt.verify(decryptedToken, JWT_SECRET);
	} catch (err) {
		throw new Error('Forbidden: Invalid token');
	}
};
