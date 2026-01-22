(function () {
  const section = document.querySelector('[data-youtube-section]');
  if (!section) {
    return;
  }

  const grid = section.querySelector('[data-youtube-grid]');
  if (!grid) {
    return;
  }

  const handle = section.getAttribute('data-channel-handle') || '@EVEngineeringNexus';
  const explicitChannelId = section.getAttribute('data-channel-id');
  const maxVideosAttr = parseInt(section.getAttribute('data-max-videos') || '3', 10);
  const maxVideos = Number.isFinite(maxVideosAttr) && maxVideosAttr > 0 ? maxVideosAttr : 3;

  const fallbackHTML = grid.innerHTML;

  const status = document.createElement('p');
  status.className = 'thq-body-small video-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Loading latest videos...';
  grid.insertAdjacentElement('beforebegin', status);

  init();

  async function init() {
    try {
      const channelId = explicitChannelId || (await resolveChannelId(handle));
      if (!channelId) {
        throw new Error('Could not resolve the YouTube channel ID.');
      }

      const videos = await fetchLatestVideos(channelId, maxVideos);
      if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('No videos returned for the requested channel.');
      }

      renderVideos(videos);
      status.remove();
    } catch (error) {
      console.error('[youtube]', error);
      grid.innerHTML = fallbackHTML;
      status.dataset.youtubeError = 'true';
      status.textContent = 'Unable to load the latest YouTube uploads right now. Showing featured picks instead.';
    }
  }

  function renderVideos(videos) {
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    videos.slice(0, maxVideos).forEach((video) => {
      const link = document.createElement('a');
      link.className = 'card';
      link.href = video.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', video.title ? `Watch ${video.title} on YouTube` : 'Watch this video on YouTube');

      const img = document.createElement('img');
      img.src = video.thumbnail;
      img.alt = video.title ? `Thumbnail for ${video.title}` : 'YouTube video thumbnail';
      img.loading = 'lazy';
      link.appendChild(img);

      const pad = document.createElement('div');
      pad.className = 'pad';

      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = video.channelTitle || 'Latest upload';
      pad.appendChild(pill);

      const heading = document.createElement('div');
      heading.className = 'thq-heading-3';
      heading.textContent = video.title || 'YouTube video';
      pad.appendChild(heading);

      const metaPieces = [];
      if (video.publishedText) {
        metaPieces.push(video.publishedText);
      }
      if (video.durationText) {
        metaPieces.push(video.durationText);
      }

      if (metaPieces.length > 0) {
        const meta = document.createElement('p');
        meta.className = 'video-meta thq-body-small';
        meta.textContent = metaPieces.join(' • ');
        pad.appendChild(meta);
      }

      link.appendChild(pad);
      fragment.appendChild(link);
    });

    grid.appendChild(fragment);
  }

  async function resolveChannelId(handleValue) {
    if (!handleValue) {
      return null;
    }

    const normalized = handleValue.trim();
    if (!normalized) {
      return null;
    }

    const handleWithAt = normalized.startsWith('@') ? normalized : `@${normalized}`;
    const candidates = [
      `https://www.youtube.com/${handleWithAt}/about`,
      `https://www.youtube.com/${handleWithAt}`
    ];

    for (const url of candidates) {
      try {
        const html = await fetchTextWithFallback(url);
        const id = extractChannelId(html);
        if (id) {
          return id;
        }
      } catch (error) {
        console.warn('[youtube] Failed to fetch channel page', error);
      }
    }

    return null;
  }

  async function fetchLatestVideos(channelId, limit) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    const xmlText = await fetchTextWithFallback(feedUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Received an invalid XML response from the YouTube feed.');
    }

    const entries = Array.from(doc.querySelectorAll('entry'));
    return entries.slice(0, limit).map((entry) => {
      const title = getText(entry, 'title');
      const link = entry.querySelector('link')?.getAttribute('href');
      const videoId = getText(entry, 'yt\\:videoId');
      const thumbnail = entry.querySelector('media\\:thumbnail')?.getAttribute('url');
      const publishedRaw = getText(entry, 'published');
      const durationRaw = entry.querySelector('media\\:content')?.getAttribute('duration');
      const channelTitle = getText(entry, 'author > name');

      const url = link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#');

      return {
        title: title || 'YouTube video',
        url,
        thumbnail: thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
        publishedText: formatPublishDate(publishedRaw),
        durationText: formatDuration(durationRaw),
        channelTitle: channelTitle || ''
      };
    }).filter((video) => Boolean(video.url) && Boolean(video.thumbnail));
  }

  function extractChannelId(html) {
    if (typeof html !== 'string') {
      return null;
    }

    const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
    return match ? match[1] : null;
  }

  async function fetchTextWithFallback(url) {
    const builders = [
      (target) => target,
      (target) => `https://cors.isomorphic-git.org/${target}`,
      (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      (target) => `https://thingproxy.freeboard.io/fetch/${target}`
    ];

    const errors = [];
    const attempted = new Set();

    for (const build of builders) {
      const requestUrl = build(url);
      if (attempted.has(requestUrl)) {
        continue;
      }
      attempted.add(requestUrl);
      try {
        const response = await fetch(requestUrl, { cache: 'no-store' });
        if (!response.ok) {
          errors.push(`${response.status} ${response.statusText}`);
          continue;
        }

        return await response.text();
      } catch (error) {
        errors.push(error.message);
      }
    }

    throw new Error(`Unable to fetch ${url}. Attempts: ${errors.join(' | ')}`);
  }

  function getText(parent, selector) {
    const node = parent.querySelector(selector);
    return node ? node.textContent : '';
  }

  function formatPublishDate(value) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function formatDuration(durationValue) {
    if (durationValue === undefined || durationValue === null) {
      return '';
    }

    const seconds = Number(durationValue);
    if (!Number.isFinite(seconds)) {
      return '';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) {
      parts.push(hours.toString());
      parts.push(minutes.toString().padStart(2, '0'));
    } else {
      parts.push(minutes.toString());
    }
    parts.push(secs.toString().padStart(2, '0'));

    return parts.join(':');
  }
})();
