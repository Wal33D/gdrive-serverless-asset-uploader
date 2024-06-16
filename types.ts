import { drive_v3 } from 'googleapis';

export interface FileDocument {
	folderId: string;
	folderName: string;
	user: string;
	ownerEmail: string;
	id: string;
	name: string;
	mimeType: string;
	starred: boolean;
	trashed: boolean;
	parents: string[];
	webContentLink: string;
	webViewLink: string;
	iconLink: string;
	createdTime: string;
	modifiedTime: string;
	owners: {
		kind: string;
		permissionId: string;
		emailAddress: string;
	}[];
	permissions: {
		id: string;
		type: string;
		emailAddress: string;
		role: string;
	}[];
	md5Checksum: string;
	size: string;
	downloadUrl: string;
	_id?: string;
}

export interface FileExistsResponse {
	exists: boolean;
	document: FileDocument | null;
}

// Define the interface for the return type
export interface RequestParams {
	base64File?: any;
	fileUrl: string;
	fileName: string;
	user: string;
	path: any;
	folderId: string;
	setPublic: boolean;
	reUpload: boolean;
	shareEmails: string[];
}

export type ServiceAccountClientsResult = {
	driveClients: drive_v3.Drive[];
	driveEmails: string[];
	count: number;
};

export interface DriveStats {
	numberOfDrives: number;
	totalFiles: number;
	totalFolders: number;
	totalUsedSpace: string;
	totalSpace: string;
	percentSpaceRemaining: string;
	nextDriveIndex?: number;
	drives: {
		ownerEmail: string;
		spaceUsed: string;
		percentSpaceRemaining: string;
	}[];
	timestamp?: Date;
}
