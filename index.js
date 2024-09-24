const NodeMediaServer = require("node-media-server");
const express = require("express");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;

// RTMP server configuration
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8000,
    allow_origin: "*",
  },
  trans: {
    ffmpeg: "/path/to/ffmpeg", // Update with the correct path to ffmpeg
    tasks: [
      {
        app: "live",
        hls: true,
        hlsFlags: "[live,append]",
        dash: true,
        dashFlags: "[live,append]",
      },
    ],
  },
};

const nms = new NodeMediaServer(config);
nms.run();

// Endpoint to get the RTMP pull link
app.get("/stream", (req, res) => {
  const rtmpLink = "rtmp://localhost/live/stream";
  res.json({ link: rtmpLink });
});

// // Keep-alive route
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`RTMP streaming available at rtmp://localhost/live/stream`);
});

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
