import { drive_v3 } from 'googleapis';

export interface FileDocument {
	fileName: string;
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
		displayName: string;
		photoLink: string;
		me: boolean;
		permissionId: string;
		emailAddress: string;
	}[];
	permissions: {
		id: string;
		type: string;
		emailAddress: string;
		role: string;
		displayName: string;
		photoLink: string;
		deleted: boolean;
	}[];
	md5Checksum: string;
	sha1Checksum: string;
	sha256Checksum: string;
	size: string;
	quotaBytesUsed: string;
	downloadUrl: string;
	_id?: string; // Optional if not immediately available
}

export interface FileExistsResponse {
	exists: boolean;
	document?: FileDocument;
}

// Define the interface for the return type
export interface RequestParams {
	fileUrl: string;
	fileName: string;
	user: string;
	path: any;
	folderId: string;
	folderName: string;
	setPublic: boolean;
	reUpload: boolean;
}

export type ServiceAccountClientsResult = {
	driveClients: drive_v3.Drive[];
	driveEmails: string[];
	count: number;
};
