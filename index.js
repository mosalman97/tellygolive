const express = require('express');
const fetch = require('node-fetch');
const cron = require('node-cron');
const cache = require('./cache');

const app = express();
const port = process.env.PORT || 8080;

const reChannelName = /"owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":\[.*?\]},"title":{"runs":\[{"text":"(.+?)"/;

// Schedule a ping every 10 minutes
// cron.schedule('*/10 * * * *', () => {
// });

const getLiveStream = async (url) => {
  try {
    let data = await cache.get(url);

    if (data) {
      return JSON.parse(data);
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to fetch data for URL: ${url}. Status: ${response.status}`);
      return { error: 'Failed to fetch data' };
    }

    const text = await response.text();
    const stream = text.match(/(?<=hlsManifestUrl":").*\.m3u8/)?.[0];
    const name = reChannelName.exec(text)?.[1];
    const logo = text.match(/(?<=owner":{"videoOwnerRenderer":{"thumbnail":{"thumbnails":\[{"url":")[^=]*/)?.[0];

    data = { name, stream, logo };
    await cache.set(url, JSON.stringify(data), { EX: 300 });

    return data;
  } catch (error) {
    console.error(`An error occurred while processing URL: ${url}`, error);
    return { error: 'An error occurred' };
  }
};

app.use(require('express-status-monitor')());

app.get('/', (req, res, nxt) => {
  try {
    res.json({ message: 'Status OK' });
  } catch (err) {
    console.error('An error occurred in / route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

app.get('/cache', async (req, res, nxt) => {
  try {
    const keys = await cache.keys('*');

    const items = [];

    for (const key of keys) {
      const data = JSON.parse(await cache.get(key));

      if (data) {
        items.push({
          url: key,
          name: data.name,
          logo: data.logo,
        });
      }
    }

    res.json(items);
  } catch (err) {
    console.error('An error occurred in /cache route', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Express app is working on port ${port}`);
});
