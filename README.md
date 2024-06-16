# 🚀 Serverless Google Drive Uploader 📂

## <img src="https://repository-images.githubusercontent.com/813896317/558c60d3-4272-44ca-b907-2a4f5ba424f7" alt="Background Image" style="width:100%; border-radius: 10px;"/>

## 🌟 Features

-   **In-memory (RAM) Streaming**: 🧠 Enables efficient uploads by streaming files directly from memory, making it suitable for serverless environments and cloud deployments.
-   **Multi-account Storage**: 🗂️ Combine the storage of multiple Google Drive service accounts, providing a massive pool of free storage.
-   **Automated File Management**: 🤖 Automatically distributes files across multiple Google Drive accounts and records all uploads in a MongoDB database.

This serverless function allows you to upload folders and files to Google Drive, automatically distributing the files across multiple Google Drive accounts. It ensures that all uploaded files are recorded in a MongoDB database, providing consistent and reliable file management. The function leverages in-memory (RAM) streaming for uploads, making it ideal for serverless setups and cloud environments.

Additionally, this solution can accept as many Google Drive service accounts as you want, combining all their storage into a massive pool of free storage space.

## 📑 Endpoints

### `/`

Handles file uploads and streaming to Google Drive.

-   **Method**: `POST`
-   **Parameters**:

    -   `fileUrl` (string, optional): URL of the file to be uploaded.
    -   `base64File` (string, optional): Base64 encoded string of the file to be uploaded.
    -   `fileUrls` (array of strings, optional): Array of URLs of the files to be uploaded.
    -   `fileName` (string, optional): Name of the file.
    -   `fileNames` (array of strings, optional): Array of names for the files being uploaded via `fileUrls`.
    -   `setPublic` (boolean, optional, default: `true`): Set the file to be publicly accessible.
    -   `reUpload` (boolean, optional, default: `false`): Re-upload the file if it already exists.
    -   `folderId` (string, optional): ID of the Google Drive folder to upload to.
    -   `folderName` (string, optional): Name of the folder.
    -   `shareEmails` (array of strings, optional): Emails to share the file with.
    -   `user` (string, optional): User identifier - defaults to anonymous so be aware if used in a multi user tenancy system that this isnt left undefined.

-   **Method**: `DELETE`
    -   Resets all drives and clears the database entries.

### `/status`

Retrieves detailed statistics about drive usage and file storage.

### `/files`

Searches and retrieves files based on various parameters.

-   **Method**: `GET` or `POST`
-   **Parameters** (can be passed as query params or in the body):
    -   `id` (string)
    -   `name` | `fileName` (string)
    -   `folderId` (string)
    -   `folderName` (string)
    -   `user` (string)
    -   `ownerEmail` (string)
    -   `size` (string)
    -   `mimeType` (string)
    -   `starred` (boolean)
    -   `trashed` (boolean)
    -   `parents` (string)
    -   `createdTime` (ISO date string)
    -   `modifiedTime` (ISO date string)
    -   `permissions` (string)
    -   `md5Checksum` (string)

## ⚙️ Configuration

Update the `vercel.json` file to configure function settings and routes:

```json
{
	"functions": {
		"api/driveHandler.ts": {
			"memory": 1024,
			"maxDuration": 60
		},
		"api/status.ts": {
			"memory": 1024,
			"maxDuration": 60
		},
		"api/files.ts": {
			"memory": 1024,
			"maxDuration": 60
		},
		"api/uploadStream.ts": {
			"memory": 1024,
			"maxDuration": 60
		}
	},
	"rewrites": [
		{ "source": "/", "destination": "/api/driveHandler" },
		{ "source": "/stream", "destination": "/api/uploadStream" },
		{ "source": "/status", "destination": "/api/status" },
		{ "source": "/files", "destination": "/api/files" }
	]
}
```

## 🚀 Upcoming Features

-   **Infinite Upload Streaming through Vercel Edge**: 🚀 Infinite upload streaming is on the way! By leveraging Vercel Edge's capabilities, we will be able to bypass the current limitations (60-second runtime, 4.5MB request body) imposed by the free plan. This will be done by chunking data to stay within the 125MB per chunk restriction and utilizing Vercel's infinite runtime for edge functions, as long as streaming is initiated within 25 seconds. This feature will allow direct streaming to Google Drive from the incoming stream sent to the server. Currently, you can bypass these limitations by sending an array of `fileUrls`, allowing the code to handle the downloading and streaming in and from the cloud.

## 📝 License

This project is licensed under the MIT License.

---

Made with ❤️ by Waleed Judah
