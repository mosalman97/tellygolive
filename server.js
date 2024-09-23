const NodeMediaServer = require("node-media-server").default;

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

const nms = new NodeMediaServer(config);
nms.run();
