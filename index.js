const express = require("express");
const NodeMediaServer = require("node-media-server");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Express Setup
const app = express();
const port = process.env.PORT || 5000;

// Serve static files (for HLS streams)
app.use(express.static(path.join(__dirname, "public")));

// Route for homepage
app.get("/", (req, res) => {
  res.send("<h1>Welcome to the Streaming Server</h1>");
});

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// RTMP Server Configuration (NodeMediaServer)
const config = {
  rtmp: {
    port: 1935, // RTMP streaming port
    chunk_size: 80000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 4000, // HTTP server for serving HLS streams
    allow_origin: "*",
  },
  trans: {
    ffmpeg: "/opt/homebrew/bin/ffmpeg", // Replace with the correct FFmpeg path
    tasks: [
      {
        app: "live", // Application name for RTMP
        hls: true,
        hlsFlags: "[hls_time=2:hls_list_size=3:hls_flags=delete_segments]",
        hlsKeep: true, // Retain .ts files
        dash: false, // DASH is disabled
      },
    ],
  },
};

// Start NodeMediaServer for RTMP and HLS
const nms = new NodeMediaServer(config);
nms.run();

// Function to start FFmpeg for transcoding the RTMP stream to HLS
function startFFmpeg() {
  const outputDir = path.join(__dirname, "public/live");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpeg = spawn("ffmpeg", [
    "-re", // Read the input at native frame rate
    "-i",
    "rtmp://localhost/live/mystream", // Input from RTMP stream (OBS)
    "-c:v",
    "libx264", // Video codec
    "-c:a",
    "aac", // Audio codec
    "-strict",
    "-2", // Strict FFmpeg settings for AAC
    "-f",
    "hls", // HLS format
    "-hls_time",
    "10", // Each HLS segment duration (in seconds)
    "-hls_list_size",
    "0", // Keep all segments (set to 0)
    "-hls_flags",
    "append_list", // Append to the playlist instead of deleting old segments
    "-hls_segment_filename",
    `${outputDir}/segment_%03d.ts`, // Segment files
    `${outputDir}/stream.m3u8`, // HLS playlist file
  ]);

  // Handle FFmpeg errors and output
  ffmpeg.stderr.on("data", (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    // Restart FFmpeg if it exits unexpectedly
    if (code !== 0) {
      console.log("Restarting FFmpeg...");
      startFFmpeg(); // Restart FFmpeg if it exits unexpectedly
    }
  });
}

// Start FFmpeg process for transcoding the RTMP stream to HLS
startFFmpeg();

setInterval(() => {
  fetch(`https://tellygolive.onrender.com/health`)
    .then((response) => {
      if (!response.ok) {
        console.error("Health check failed:", response.statusText);
      } else {
        console.log("Server is healthy");
      }
    })
    .catch((error) => {
      console.error("Error pinging health check:", error);
    });
}, 10000);
// Start Express server
app.listen(port, () => {
  console.log(`Express app is running on http://localhost:${port}`);
});
