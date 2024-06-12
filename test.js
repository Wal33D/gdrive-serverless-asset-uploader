const express = require('express');
const app = express();

app.use(express.raw({ type: '*/*', limit: '50mb' }));

app.post('/', (req, res) => {
	console.log('Received data');
	res.send('Data received');
});

app.listen(3001, () => {
	console.log('Server listening on port 3001');
});
