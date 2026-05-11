const express = require('express');

const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function formatVideo(item) {
  return {
    id: item.id.videoId || item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  };
}

router.get('/video/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid YouTube video ID' });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const video = data.items?.[0];
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: formatVideo(video) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch YouTube video: ' + e.message });
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(q)}&type=video&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const results = data.items.map(formatVideo);

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Failed to search YouTube: ' + e.message });
  }
});

module.exports = router;
