import { drive_v3 } from 'googleapis';
import { DriveStats } from '../types';
import { connectToMongo } from '../utils/mongo';
import { getCurrentDriveIndex } from '../utils/mongo';
import { getServiceAccountClients } from '../utils/getServiceAccountClients';
import { VercelRequest, VercelResponse } from '@vercel/node';

export const getDriveStats = async (): Promise<DriveStats> => {
	const db = await connectToMongo();
	const statsCollection = db.collection('driveStats');

	// Check if the stats were generated less than an hour ago
	const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
	const recentStats: any = await statsCollection.findOne({ timestamp: { $gte: oneHourAgo } });

	if (recentStats) {
		fetchAndSaveDriveStats(db);
		return recentStats;
	}

	// If no recent stats, fetch new ones synchronously
	const newStats = await fetchAndSaveDriveStats(db);
	return newStats;
};

const fetchAndSaveDriveStats = async (db: any): Promise<DriveStats> => {
	const { driveClients, driveEmails, count } = await getServiceAccountClients();
	let totalFiles = 0;
	let totalFolders = 0;
	let totalUsedSpace = 0;
	const drives: { ownerEmail: string; spaceUsed: string; percentSpaceRemaining: string }[] = [];
	const totalSpaceMB = count * 14 * 1024; // Total space in MB
	const totalSpace = (totalSpaceMB / 1024).toFixed(2) + 'GB'; // Total space in GB

	for (let i = 0; i < count; i++) {
		const drive = driveClients[i];
		const driveEmail = driveEmails[i];
		const { totalFiles: driveTotalFiles, usedSpace, totalFolders: driveTotalFolders } = await getFileCountAndUsedSpace(drive);

		totalFiles += driveTotalFiles;
		totalFolders += driveTotalFolders;
		totalUsedSpace += usedSpace;

		const usedSpaceMB = (usedSpace / (1024 * 1024)).toFixed(2);
		const percentSpaceRemaining = (((14 * 1024 - usedSpace / (1024 * 1024)) / (14 * 1024)) * 100).toFixed(2) + '%';

		drives.push({
			ownerEmail: driveEmail,
			spaceUsed: `${usedSpaceMB}MB / 14000MB`, // Convert used space to MB and format as fraction of 14,000MB
			percentSpaceRemaining,
		});
	}

	const totalUsedSpaceMB = (totalUsedSpace / (1024 * 1024)).toFixed(2) + 'MB'; // Convert total used space to MB
	const overallPercentSpaceRemaining = (((totalSpaceMB - totalUsedSpace / (1024 * 1024)) / totalSpaceMB) * 100).toFixed(2) + '%';

	const nextDriveIndex = await getCurrentDriveIndex(db);

	const consolidated: DriveStats = {
		nextDriveIndex,
		numberOfDrives: count,
		totalFiles,
		totalFolders,
		totalUsedSpace: totalUsedSpaceMB,
		totalSpace,
		percentSpaceRemaining: overallPercentSpaceRemaining,
		drives,
		timestamp: new Date(),
	};

	// Save the stats to the database
	await db.collection('driveStats').insertOne(consolidated);
	return consolidated;
};

const getFileCountAndUsedSpace = async (
	drive: drive_v3.Drive
): Promise<{
	totalFiles: number;
	usedSpace: number;
	trashedFiles: number;
	trashedSpace: number;
	totalFolders: number;
}> => {
	let totalFiles = 0;
	let usedSpace = 0;
	let trashedFiles = 0;
	let trashedSpace = 0;
	let totalFolders = 0;
	let pageToken: string | undefined = undefined;

	// Non-trashed files and folders
	do {
		const listParams: drive_v3.Params$Resource$Files$List = {
			q: 'trashed = false',
			fields: 'nextPageToken, files(size, mimeType)',
			spaces: 'drive',
			pageToken: pageToken || undefined,
		};

		const fileList = await drive.files.list(listParams);
		const files = fileList.data.files || [];

		totalFiles += files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder').length;
		totalFolders += files.filter(file => file.mimeType === 'application/vnd.google-apps.folder').length;
		usedSpace += files.reduce((sum, file) => sum + (file.size ? parseInt(file.size, 10) : 0), 0);

		pageToken = fileList.data.nextPageToken || undefined;
	} while (pageToken);

	// Trashed files and folders
	pageToken = undefined;
	do {
		const listParams: drive_v3.Params$Resource$Files$List = {
			q: 'trashed = true',
			fields: 'nextPageToken, files(size)',
			spaces: 'drive',
			pageToken: pageToken || undefined,
		};

		const fileList = await drive.files.list(listParams);
		const files = fileList.data.files || [];

		trashedFiles += files.length;
		trashedSpace += files.reduce((sum, file) => sum + (file.size ? parseInt(file.size, 10) : 0), 0);

		pageToken = fileList.data.nextPageToken || undefined;
	} while (pageToken);

	return { totalFiles, usedSpace, trashedFiles, trashedSpace, totalFolders };
};

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	if (req.method !== 'GET') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	try {
		res.setHeader('Cache-Control', 's-maxage=17200, stale-while-revalidate');
		const stats = await getDriveStats();
		res.status(200).json({
			status: true,
			data: stats,
			message: 'Drive stats retrieved successfully.',
		});
	} catch (error) {
		console.error('Error retrieving drive stats:', error);
		res.status(500).json({
			status: false,
			data: null,
			message: `Failed to retrieve drive stats ${(error as Error).message}`,
		});
	}
}

export default handler;
