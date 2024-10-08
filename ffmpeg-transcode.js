const { spawn } = require("child_process");
const path = require("path");

// Function to start FFmpeg for transcoding RTMP to HLS
function startFFmpeg() {
  const outputDir = path.join(__dirname, "public/live");

  const ffmpeg = spawn("ffmpeg", [
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
    "10", // Number of segments to keep in the playlist
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
    // Attempt to restart FFmpeg if it exits
    if (code !== 0) {
      console.log("Restarting FFmpeg...");
      startFFmpeg(); // Restart FFmpeg if it exits unexpectedly
    }
  });
}

module.exports = startFFmpeg;
