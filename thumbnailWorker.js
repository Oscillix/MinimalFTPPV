const { workerData, parentPort } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');

const { streamUrl, outputFile } = workerData;

// Use FFmpeg to generate a thumbnail
ffmpeg(streamUrl)
    .inputOptions(['-t 00:00:01']) // Set a fixed duration of 1 second to allow frame capture
    .outputOptions([
        '-vf', 'thumbnail,scale=400:225', // Scale to 400px width and 225px height
        '-frames:v', '1' // Capture a single frame
    ])
    .output(outputFile)
    .on('end', () => {
        parentPort.postMessage({ status: 'success' });
    })
    .on('error', (err) => {
        parentPort.postMessage({ status: 'error', error: err.message });
    })
    .run();
