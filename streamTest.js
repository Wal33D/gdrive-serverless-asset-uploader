const axios = require('axios');

const streamFileFromUrl = async (sourceUrl, targetUrl) => {
	try {
		const response = await axios({
			method: 'get',
			url: sourceUrl,
			responseType: 'stream',
		});

		response.data.on('end', () => {
			console.log('No more data to read from source URL.');
		});

		response.data.on('error', error => {
			console.error('Error reading data from source URL:', error);
		});

		const uploadResponse = await axios({
			method: 'post',
			url: targetUrl,
			data: response.data,
			headers: {
				'Content-Type': 'application/octet-stream',
				'Transfer-Encoding': 'chunked',
			},
			transformRequest: (data, headers) => {
				delete headers['content-length'];
				return data;
			},
		});

		console.log('File uploaded successfully:', uploadResponse.data);
	} catch (error) {
		console.error('Error during file streaming:', error);
	}
};

const sourceUrl = 'https://lh3.googleusercontent.com/BHqgpIv3ViR35Te35Dv4eeZxeG55d0wVTEQhGvRO8yhsa--meOxokNNDTFlDhUfM3uUtvSGY4TDuYqv8kCQ=w80-h80';
const targetUrl = 'http://localhost:3000/';

streamFileFromUrl(sourceUrl, targetUrl);
