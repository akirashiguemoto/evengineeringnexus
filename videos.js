(function () {
  const grid = document.querySelector('[data-videos-grid]');
  if (!grid) {
    return;
  }

  const emptyState = document.querySelector('[data-videos-empty]');
  const maxVideos = parseInt(grid.dataset.videosMax || '3', 10);
  const channelHandle = (grid.dataset.channelHandle || '').trim();
  let channelId = (grid.dataset.channelId || '').trim();
  const channelUrl = (grid.dataset.channelUrl || '').trim() ||
    (channelHandle ? `https://www.youtube.com/${channelHandle.startsWith('@') ? channelHandle : '@' + channelHandle}` : 'https://www.youtube.com');

  const normalizedHandle = channelHandle ? (channelHandle.startsWith('@') ? channelHandle : '@' + channelHandle) : '';

  init();

  async function init() {
    try {
      const videos = await fetchLatestVideos();
      if (!Array.isArray(videos) || videos.length === 0) {
        showEmptyState();
        return;
      }

      renderVideos(videos.slice(0, Number.isFinite(maxVideos) && maxVideos > 0 ? maxVideos : videos.length));
    } catch (error) {
      console.error('Failed to load latest videos', error);
      showEmptyState();
    }
  }

  async function fetchLatestVideos() {
    const strategies = [];

    if (normalizedHandle) {
      strategies.push(() => fetchFromPiped(normalizedHandle));
    }

    strategies.push(() => {
      if (!channelId) {
        return [];
      }
      return fetchFromRss(channelId);
    });

    for (const strategy of strategies) {
      try {
        const videos = await strategy();
        if (Array.isArray(videos) && videos.length > 0) {
          return videos;
        }
      } catch (error) {
        console.warn('Video fetch strategy failed', error);
      }
    }

    return [];
  }

  async function fetchFromPiped(handle) {
    const endpoints = [
      `https://piped.video/api/v1/channel/${encodeURIComponent(handle)}`,
      `https://piped.mha.fi/api/v1/channel/${encodeURIComponent(handle)}`,
      `https://pipedapi.kavin.rocks/channel/${encodeURIComponent(handle)}`
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        if (!channelId && data && typeof data.id === 'string') {
          channelId = data.id;
          grid.dataset.channelId = data.id;
        }

        const items = Array.isArray(data.latestVideos) && data.latestVideos.length > 0
          ? data.latestVideos
          : Array.isArray(data.videos) && data.videos.length > 0
            ? data.videos
            : Array.isArray(data.relatedStreams)
              ? data.relatedStreams
              : [];
        const normalized = items
          .map((item) => {
            const videoId = extractVideoId(item.id, item.videoId, item.url);
            const title = item.title || '';
            if (!videoId || !title) {
              return null;
            }

            return {
              id: videoId,
              title,
              url: buildWatchUrl(videoId, item.url),
              description: item.shortDescription || '',
              thumbnail: resolveThumbnail(videoId, item.thumbnail, item.thumbnails),
              publishedAt: extractPublishedDate(item),
              relativeTime: item.uploadedDate || ''
            };
          })
          .filter(Boolean);

        if (normalized.length > 0) {
          return normalized;
        }
      } catch (error) {
        console.warn('Failed to fetch from piped endpoint', url, error);
      }
    }

    return [];
  }

  async function fetchFromRss(id) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
    const endpoints = [
      feedUrl,
      `https://cors.isomorphic-git.org/${feedUrl}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const entries = Array.from(doc.querySelectorAll('entry'));

        if (entries.length === 0) {
          continue;
        }

        const videos = entries.map((entry) => {
          const videoId = getTextContent(entry, 'yt\\:videoId') || getTextContent(entry, 'videoId');
          const title = getTextContent(entry, 'title');
          if (!videoId || !title) {
            return null;
          }

          const linkEl = entry.querySelector('link');
          const urlAttr = linkEl ? linkEl.getAttribute('href') : '';
          const publishedAt = getTextContent(entry, 'published');
          const thumbEl = entry.querySelector('media\\:thumbnail, thumbnail');
          const thumbnailUrl = thumbEl ? thumbEl.getAttribute('url') : '';

          return {
            id: videoId,
            title,
            url: urlAttr || buildWatchUrl(videoId),
            thumbnail: thumbnailUrl || resolveThumbnail(videoId),
            publishedAt,
            relativeTime: formatRelativeTime(publishedAt)
          };
        }).filter(Boolean);

        if (videos.length > 0) {
          return videos;
        }
      } catch (error) {
        console.warn('Failed to fetch or parse RSS feed', url, error);
      }
    }

    return [];
  }

  function renderVideos(videos) {
    const fragment = document.createDocumentFragment();

    videos.forEach((video) => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = video.url || channelUrl;
      card.target = '_blank';
      card.rel = 'noopener';

      const img = document.createElement('img');
      img.src = video.thumbnail || '';
      img.alt = video.title ? `${video.title} thumbnail` : 'YouTube video thumbnail';
      card.appendChild(img);

      const pad = document.createElement('div');
      pad.className = 'pad';

      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = video.relativeTime || formatRelativeTime(video.publishedAt) || 'Watch now';
      pad.appendChild(pill);

      const heading = document.createElement('div');
      heading.className = 'thq-heading-3';
      heading.textContent = video.title || 'YouTube video';
      pad.appendChild(heading);

      card.appendChild(pad);
      fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  function showEmptyState() {
    grid.innerHTML = '';

    if (emptyState) {
      emptyState.hidden = false;
    } else {
      const fallback = document.createElement('p');
      fallback.className = 'videos-empty thq-body-large';
      fallback.innerHTML = `Unable to load the latest videos right now. Watch directly on <a href="${channelUrl}" target="_blank" rel="noopener">YouTube</a>.`;
      grid.parentElement?.appendChild(fallback);
    }
  }

  function buildWatchUrl(videoId, fallbackUrl) {
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (fallbackUrl) {
      if (fallbackUrl.startsWith('http')) {
        return fallbackUrl;
      }

      return `https://www.youtube.com${fallbackUrl}`;
    }

    return channelUrl;
  }

  function resolveThumbnail(videoId, primary, alternatives) {
    if (primary && primary.startsWith('http')) {
      return primary;
    }

    if (Array.isArray(alternatives)) {
      const preferred = alternatives.find((item) => item && item.url);
      if (preferred) {
        return preferred.url;
      }
    }

    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return '';
  }

  function extractVideoId(...candidates) {
    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
        return candidate;
      }

      const match = /[?&]v=([a-zA-Z0-9_-]{11})/.exec(candidate);
      if (match && match[1]) {
        return match[1];
      }

      const pathMatch = /\/([a-zA-Z0-9_-]{11})(?:[/?]|$)/.exec(candidate);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
    }

    return '';
  }

  function extractPublishedDate(item) {
    if (item.uploaded) {
      const value = Number(item.uploaded);
      if (!Number.isNaN(value)) {
        return new Date(value * 1000).toISOString();
      }
    }

    if (item.uploadedDate && !/ago$/.test(item.uploadedDate)) {
      const parsed = Date.parse(item.uploadedDate);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }

    return '';
  }

  function formatRelativeTime(isoDate) {
    if (!isoDate) {
      return '';
    }

    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = Date.now();
    const diff = date.getTime() - now;
    const units = [
      ['year', 1000 * 60 * 60 * 24 * 365],
      ['month', 1000 * 60 * 60 * 24 * 30],
      ['week', 1000 * 60 * 60 * 24 * 7],
      ['day', 1000 * 60 * 60 * 24],
      ['hour', 1000 * 60 * 60],
      ['minute', 1000 * 60]
    ];

    if (typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function') {
      const rtf = new Intl.RelativeTimeFormat(document.documentElement.lang || 'en', { numeric: 'auto' });
      for (const [unit, value] of units) {
        const amount = diff / value;
        if (Math.abs(amount) >= 1 || unit === 'minute') {
          return rtf.format(Math.round(amount), unit);
        }
      }
    }

    const diffSeconds = Math.round(Math.abs(diff) / 1000);
    const suffix = diff <= 0 ? 'ago' : 'from now';

    for (const [unit, value] of units) {
      const amount = Math.floor(diffSeconds / (value / 1000));
      if (amount >= 1) {
        return `${amount} ${unit}${amount > 1 ? 's' : ''} ${suffix}`;
      }
    }

    return `moments ${suffix}`;
  }

  function getTextContent(parent, selector) {
    if (!parent) {
      return '';
    }

    const element = parent.querySelector(selector);
    return element && element.textContent ? element.textContent.trim() : '';
  }
})();
