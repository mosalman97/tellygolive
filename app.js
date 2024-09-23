const express = require("express");
const path = require("path");
const startFFmpeg = require("./ffmpeg-transcode");
const NodeMediaServer = require("node-media-server");

// NodeMediaServer configuration
const config = {
  rtmp: {
    port: 1935, // RTMP default port
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8080, // Use a different port for HTTP
    allow_origin: "*",
  },
};

// Start NodeMediaServer
const nms = new NodeMediaServer(config);
nms.run();

// Start FFmpeg to transcode RTMP to HLS
startFFmpeg();

const app = express();

// Serve HLS stream
app.use("/live", express.static(path.join(__dirname, "public/live")));

// Root route to test the server
app.get("/", (req, res) => {
  res.send("Live streaming server is running.");
});

// Start Express server
const port = 5050;
app.listen(port, () => {
  console.log(`Express server is running on http://localhost:${port}`);
});
