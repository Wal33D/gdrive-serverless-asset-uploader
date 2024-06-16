import { drive_v3 } from 'googleapis';

const defaultDescription = 'Uploaded by 🚀 Google Drive Uploader²';

export const setFilePermissions = async ({
	drive,
	fileId,
	description = defaultDescription,
	setPublic = true,
	shareEmails = [],
}: {
	drive: drive_v3.Drive;
	fileId: string;
	description?: string;
	setPublic?: boolean;
	shareEmails?: string[];
}): Promise<{ status: boolean; message: string }> => {
	let status = false;
	let message = '';

	try {
		const updateMetadata: drive_v3.Schema$File = {
			description,
			contentHints: {},
		};

		await drive.files.update({
			fileId,
			requestBody: updateMetadata,
		});
		message = 'File metadata updated. ';

		// Set file to public if setPublic is true
		if (setPublic) {
			await drive.permissions.create({
				fileId,
				requestBody: { type: 'anyone', role: 'reader' },
			});
			message += 'File set to public. ';
		}

		// Share with specific emails if provided and not empty
		const validEmails = shareEmails.filter(email => email.trim() !== '');

		if (validEmails.length > 0) {
			for (const email of validEmails) {
				await drive.permissions.create({
					fileId,
					requestBody: { type: 'user', role: 'writer', emailAddress: email },
				});
			}
			message += `File shared with emails: ${validEmails.join(', ')}.`;
		} else if (!setPublic) {
			message += 'No valid emails provided to share the file with.';
		}

		status = true;
	} catch (error: any) {
		message = `Error: ${error.message}`;
	}

	return { status, message };
};
