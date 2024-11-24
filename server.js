const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');

const app = express();
const PORT = 3000;
const WEB_PORT = 1337;
const outputDir = path.join(__dirname, 'thumbnails');

app.use('/thumbnails', express.static(outputDir));

async function ensureDirectoryExists() {
    try {
        await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
        console.error(`Error creating thumbnails directory: ${error.message}`);
        throw new Error('Unable to create directory');
    }
}

async function generateThumbnail(req, res) {
    const streamUrl = req.query.url;
    const outputFile = path.join(outputDir, `${encodeURIComponent(streamUrl)}.webp`);

    try {
        try {
            await fs.access(outputFile);
            return res.sendFile(outputFile);
        } catch (err) {
            // File doesn't exist, proceed with thumbnail generation
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
    } catch (error) {
        console.error(`Error processing request for thumbnail: ${error.message}`);
        res.status(500).send('Error generating thumbnail.');
    }
}

app.get('/thumbnail', async (req, res) => {
    try {
        await ensureDirectoryExists();

        await generateThumbnail(req, res);
    } catch (error) {
        res.status(500).send('Server error.');
    }
});

app.listen(PORT, () => {
    console.log(`Thumbnail server running at http://localhost:${PORT}`);
});

const webApp = express();

webApp.use(express.static(path.join(__dirname, 'public')));

webApp.listen(WEB_PORT, () => {
    console.log(`Website server running at http://localhost:${WEB_PORT}`);
});
