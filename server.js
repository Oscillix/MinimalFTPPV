const express = require('express');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');

const app = express();
const PORT = 3000;

app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

app.get('/thumbnail', (req, res) => {
    const streamUrl = req.query.url;
    const outputDir = path.join(__dirname, 'thumbnails');
    const outputFile = path.join(outputDir, `${encodeURIComponent(streamUrl)}.jpg`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    if (fs.existsSync(outputFile)) {
        return res.sendFile(outputFile);
    }

    const worker = new Worker(path.join(__dirname, 'thumbnailWorker.js'), {
        workerData: { streamUrl, outputFile }
    });

    worker.on('message', (message) => {
        if (message.status === 'success') {
            console.log(`Thumbnail generated: ${outputFile}`);
            res.sendFile(outputFile);
        } else {
            console.error(`Error generating thumbnail: ${message.error}`);
            res.status(500).send('Error generating thumbnail.');
        }
    });

    worker.on('error', (error) => {
        console.error(`Worker error: ${error.message}`);
        res.status(500).send('Worker encountered an error.');
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Thumbnail server running at http://localhost:${PORT}`);
});
