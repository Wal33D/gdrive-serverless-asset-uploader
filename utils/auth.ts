import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'myencryptionkey12345678901234567890'; // Must be 256 bits (32 characters)

// Decryption function
function decrypt(text: string): string {
	const textParts = text.split(':');
	const iv = Buffer.from(textParts.shift()!, 'hex');
	const encryptedText = Buffer.from(textParts.join(':'), 'hex');
	const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}

// Authorization function
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
