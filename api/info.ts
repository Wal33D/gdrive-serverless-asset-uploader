import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AppInfo {
	appTitle: string;
	storageClusterName: string;
	timestamp: string;
}

function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const appTitle = process.env.APP_TITLE || 'Default App Title';
		const storageClusterName = process.env.APP_CLUSTER_NAME || 'Default Cluster Name';

		const appInfo: AppInfo = {
			appTitle: appTitle,
			storageClusterName: storageClusterName,
			timestamp: new Date().toISOString(),
		};

		res.setHeader('Content-Type', 'application/json');
		res.status(200).json(appInfo);
	} catch (error) {
		console.error('Error retrieving app info:', error);
		res.status(500).json({ error: 'Error retrieving app info' });
	}
}

export default handler;
