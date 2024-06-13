import { capitalize } from '../utils/capitalize';
import { getDriveStats } from '../api/status';
import type { DriveStats } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const handleGetRequest = async ({ request, response }: { request: VercelRequest; response: VercelResponse }): Promise<void> => {
	const { name } = request.query;
	const userName = Array.isArray(name) ? name[0] : name || '';
	try {
		const stats: DriveStats = await getDriveStats();
		const appTitle = stats.appTitle;
		const pageTitle = userName ? `Hello ${capitalize(userName)}!` : `🚀 ${appTitle}`;
		const driveCount = stats.numberOfDrives;
		const totalFilesStored = stats.totalFiles;
		const totalUsage = stats.totalUsedSpace;
		const percentRemaining = stats.percentSpaceRemaining;
		const storageClusterName = stats.storageClusterName;
		const totalSpaceGB = `${parseFloat(stats.totalSpace.replace('MB', ''))} GB`;

		//@ts-ignore
		const lastModified = new Date(stats.timestamp).toLocaleDateString('en-US', {
			month: '2-digit',
			day: '2-digit',
			year: '2-digit',
		});
		const driveDetails = stats.drives.map((drive, index) => `Drive ${index + 1}: ${drive.percentSpaceRemaining} remaining`).join('<br>');

		const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${appTitle}</title>
          <link rel="icon" href="https://res.cloudinary.com/aquataze/image/upload/c_fill,w_32,h_32/v1718073479/gdrive.png" type="image/png">
          <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background: #121212;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 1rem;
            }
            .container {
              text-align: center;
              background: #1e1e1e;
              padding: 3rem;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
              width: 100%;
            }
            h1 {
              color: #bb86fc;
              font-size: 2rem;
              margin-bottom: 1rem;
            }
            p {
              font-size: 1rem;
              line-height: 1.5;
            }
            .stats-container {
              margin-top: 1.5rem;
              text-align: center;
              background: #2e2e2e;
              padding: 1rem;
              border-radius: 10px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .tile-container {
              display: flex;
              justify-content: space-around;
              align-items: center;
              width: 100%;
              flex-wrap: wrap;
            }
            .tile {
              background: #333333;
              padding: 1rem;
              border-radius: 8px;
              margin: 0.5rem;
              color: #bb86fc;
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 150px;
              height: 150px;
              position: relative;
              justify-content: center;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .tile i, .tile img {
              font-size: 2rem;
              margin-bottom: 0.5rem;
            }
            .tile .online-indicator {
              position: absolute;
              top: 10px;
              right: 10px;
              width: 12px;
              height: 12px;
              background-color: #00ff00;
              border-radius: 50%;
            }
            .tile .drive-details {
              display: none;
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              background: #2e2e2e;
              padding: 0.5rem;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              white-space: nowrap;
            }
            .tile:hover .drive-details {
              display: block;
              border-radius: 4px;
              border: dashed 1px #bb86fc;
            }
            .circular-progress {
              position: relative;
              width: 80px;
              height: 80px;
            }
            .circular-progress svg {
              transform: rotate(-90deg);
              width: 100%;
              height: 100%;
            }
            .circular-progress circle {
              fill: none;
              stroke-width: 10;
            }
            .circular-progress .background {
              stroke: #555555;
            }
            .circular-progress .foreground {
              stroke: #bb86fc;
              stroke-linecap: round;
              transition: stroke-dashoffset 0.3s;
            }
            .circular-progress .percentage {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 1rem;
              color: #bb86fc;
            }
            footer {
              margin-top: 2rem;
              color: #bbbbbb;
              font-size: 0.9rem;
            }
            .drive-logo {
              height: 36px;
            }
            .github-icon{
            font-weight: 0;
            font-size: 3rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${pageTitle}</h1>
            <p>This cool serverless app lets you upload files to Google Drive with virtually infinite storage by spreading them across multiple 15GB free service worker Google Drive buckets. Add as many as you'd like! 🚀📂</p>
            <div class="stats-container">
              <div class="tile-container">
                <div class="tile">
                  <div class="online-indicator"></div>
                  <i class="fa fa-hdd-o"></i>
                  <strong>${driveCount} Drives Online</strong>
                  <div class="drive-details">${driveDetails}</div>
                </div>
                <div class="tile">
                  <i class="fa fa-file"></i>
                  <strong>${totalFilesStored} Files Stored</strong>
                <h6>Last Modified: ${lastModified}</h6>
                </div>
                 <div class="tile">
                <img src="https://res.cloudinary.com/aquataze/image/upload/v1718073479/gdrive.png" alt="Google Drive Logo" class="drive-logo">
                <strong>Google Drive</strong>
                </div>
                <div class="tile">
                  <i class="fa fa-database"></i>
                  <h6>Used Space: ${totalUsage}</h6>
                  <h6>Total Space: ${totalSpaceGB}</h6>
                </div>
                <div class="tile">
                  <div class="circular-progress">
                    <svg>
                      <circle class="background" cx="40" cy="40" r="35"></circle>
                      <circle class="foreground" cx="40" cy="40" r="35" stroke-dasharray="219.9" stroke-dashoffset="${(
							219.9 *
							(100 - parseFloat(percentRemaining))
						).toFixed(1)}"></circle>
                    </svg>
                    <div class="percentage">${percentRemaining}</div>
                  </div>
                  <strong>Space Remaining</strong>
                </div>
              </div>
            </div>
            <footer>
              <p class="link">
                <i class="fa fa-github github-icon"></i>
              </p>
              <h6>Check out the code on GitHub: <a href="https://github.com/Wal33D/gdrive-serverless-asset-uploader" target="_blank">https://github.com/Wal33D/gdrive-serverless-asset-uploader</a></h6>
              <h6> Made with ❤️ by Waleed Judah</h6>
              <h6> Storage Cluster Name: ${storageClusterName}</h6>
            </footer>
          </div>
        </body>
        </html>
      `;

		response.setHeader('Content-Type', 'text/html');
		response.send(htmlContent);
	} catch (error) {
		console.error('Error retrieving drive stats:', error);
		response.status(500).send('Error retrieving drive stats');
	}
};
