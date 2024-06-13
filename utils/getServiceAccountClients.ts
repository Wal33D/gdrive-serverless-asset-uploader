import { google } from 'googleapis';
import { ServiceAccountClientsResult } from '../types';

export const getServiceAccountClients = async (): Promise<ServiceAccountClientsResult> => {
	const serviceAccountsJson = Object.keys(process.env)
		.filter(key => key.startsWith('SERVICE_ACCOUNT_JSON_'))
		.map(key => JSON.parse(process.env[key] as string));
	const emails = [] as any;
	const clients = await Promise.all(
		serviceAccountsJson.map(async credentials => {
			const auth: any = new google.auth.GoogleAuth({
				credentials,
				scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
			});
			const client = await auth.getClient();
			emails.push(credentials.client_email);

			return google.drive({ version: 'v3', auth: client });
		})
	);
	return {
		driveClients: clients,
		driveEmails: emails,
		count: emails.length,
	};
};
