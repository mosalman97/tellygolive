const express = require('express');
const fetch = require('node-fetch');
const cron = require('node-cron');
const cache = require('./cache');

const app = express();
const port = process.env.PORT || 8080;

const reChannelName = /"owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":\[.*?\]},"title":{"runs":\[{"text":"(.+?)"/;

// Function to get the live stream URL and other details
const getLiveStream = async (url) => {
  try {
    // Check cache first
    let data = await cache.get(url);

    if (data) {
      return JSON.parse(data);
    }

    // Fetch data from the URL
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch data for URL: ${url}. Status: ${response.status}`);

      if (response.status === 403) {
        return { error: 'Access forbidden. You may not have permission to access this stream.' };
      }

      return { error: 'Failed to fetch data' };
    }

    const text = await response.text();
    const stream = text.match(/(?<=hlsManifestUrl":").*\.m3u8/)?.[0];
    const name = reChannelName.exec(text)?.[1];
    const logo = text.match(/(?<=owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":\[{"url":")[^=]*/)?.[0];

    if (!stream) {
      return { error: 'Stream not found in the response' };
    }

    // Cache data with an expiration time of 5 minutes (300 seconds)
    data = { name, stream, logo, expiration: Date.now() + 300000 };
    await cache.set(url, JSON.stringify(data), { EX: 300 });

    return data;
  } catch (error) {
    console.error(`An error occurred while processing URL: ${url}`, error);
    return { error: 'An unexpected error occurred' };
  }
};

// Route to check the status of the server
app.get('/', (req, res, nxt) => {
  try {
    res.json({ message: 'Status OK' });
  } catch (err) {
    console.error('An error occurred in / route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to fetch live stream for a channel by ID
app.get('/channel/:id.m3u8', async (req, res, nxt) => {
  try {
    const url = `https://www.youtube.com/channel/${req.params.id}/live`;
    const { stream, error } = await getLiveStream(url);

    if (error) {
      res.status(400).json({ error }); // Use 400 for client errors
    } else if (stream) {
      res.redirect(stream);
    } else {
      res.sendStatus(404); // Resource not found
    }
  } catch (err) {
    console.error('An error occurred in /channel/:id.m3u8 route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to fetch a video stream by video ID
app.get('/video/:id.m3u8', async (req, res, nxt) => {
  try {
    const url = `https://www.youtube.com/watch?v=${req.params.id}`;
    const { stream, error } = await getLiveStream(url);

    if (error) {
      res.status(400).json({ error }); // Use 400 for client errors
    } else if (stream) {
      res.redirect(stream);
    } else {
      res.sendStatus(404); // Resource not found
    }
  } catch (err) {
    console.error('An error occurred in /video/:id.m3u8 route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to fetch cached items
app.get('/cache', async (req, res, nxt) => {
  try {
    const keys = await cache.keys('*');

    const items = [];

    for (const key of keys) {
      const data = JSON.parse(await cache.get(key));

      if (data && data.expiration > Date.now()) {
        items.push({
          url: key,
          name: data.name,
          logo: data.logo,
          expiresIn: data.expiration - Date.now(), // Remaining time before expiration
        });
      }
    }

    res.json(items);
  } catch (err) {
    console.error('An error occurred in /cache route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Express app is working on port ${port}`);
});
