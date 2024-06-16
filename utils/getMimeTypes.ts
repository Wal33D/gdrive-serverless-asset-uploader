import path from 'path';

export const mimeTypes: { [key: string]: string } = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.bmp': 'image/bmp',
	'.webp': 'image/webp',
	'.pdf': 'application/pdf',
	'.txt': 'text/plain',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.ppt': 'application/vnd.ms-powerpoint',
	'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'.zip': 'application/zip',
	'.rar': 'application/x-rar-compressed',
	'.7z': 'application/x-7z-compressed',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.mp4': 'video/mp4',
	'.avi': 'video/x-msvideo',
	'.json': 'application/json',
	// Add more mappings as needed
};

export const getMimeType = (fileName: string): string => {
	const ext = path.extname(fileName).toLowerCase();
	return mimeTypes[ext] || 'application/octet-stream';
};
