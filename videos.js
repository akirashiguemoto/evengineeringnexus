(function () {
  const SECTION_SELECTOR = '[data-video-section]';
  const GRID_SELECTOR = '[data-video-grid]';
  const DEFAULT_ERROR_MESSAGE = 'Unable to load the latest videos right now. Please try again later.';
  const DEFAULT_PILL_LABEL = 'YouTube';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const sections = document.querySelectorAll(SECTION_SELECTOR);
    if (!sections.length) {
      return;
    }

    sections.forEach((section) => {
      loadSection(section);
    });
  }

  async function loadSection(section) {
    const grid = section.querySelector(GRID_SELECTOR);
    if (!grid) {
      return;
    }

    const errorElement = section.querySelector('[data-video-error]');
    if (errorElement) {
      errorElement.hidden = true;
    }

    const maxVideos = parsePositiveInt(section.dataset.maxVideos, 3);
    const pillLabel = section.dataset.pillLabel || DEFAULT_PILL_LABEL;
    const channelIdAttribute = (section.dataset.channelId || '').trim();
    const channelHandle = (section.dataset.channelHandle || '').trim();

    try {
      const resolution = await resolveChannelId(channelIdAttribute, channelHandle);
      let { channelId, pipedData } = resolution;

      if (!channelId) {
        throw new Error('Channel ID could not be determined.');
      }

      let videos = [];

      try {
        videos = await fetchVideosFromFeed(channelId);
      } catch (feedError) {
        if (!pipedData) {
          pipedData = await fetchPipedData([channelHandle, channelId]);
        }

        if (pipedData) {
          videos = extractVideosFromPiped(pipedData);
        }

        if (!videos.length) {
          throw feedError;
        }
      }

      if (!videos.length) {
        if (!pipedData) {
          pipedData = await fetchPipedData([channelHandle, channelId]);
        }

        if (pipedData) {
          videos = extractVideosFromPiped(pipedData);
        }
      }

      if (!videos.length) {
        showError(section, 'No videos found yet. Check back soon!');
        return;
      }

      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      videos.slice(0, maxVideos).forEach((video) => {
        fragment.appendChild(createVideoCard(video, pillLabel));
      });
      grid.appendChild(fragment);

      if (errorElement) {
        errorElement.hidden = true;
      }
    } catch (error) {
      console.error('[Latest videos] Failed to update video grid', error);
      showError(section, DEFAULT_ERROR_MESSAGE);
    }
  }

  function showError(section, message) {
    const grid = section.querySelector(GRID_SELECTOR);
    if (grid) {
      grid.innerHTML = '';
    }

    const errorElement = section.querySelector('[data-video-error]');
    if (errorElement) {
      errorElement.textContent = message || DEFAULT_ERROR_MESSAGE;
      errorElement.hidden = false;
    }
  }

  function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  async function resolveChannelId(channelId, handle) {
    if (channelId) {
      return { channelId: channelId.trim(), pipedData: null };
    }

    if (!handle) {
      throw new Error('Set data-channel-id or data-channel-handle on the latest videos section.');
    }

    const pipedData = await fetchPipedData([handle]);
    if (!pipedData) {
      throw new Error('Unable to resolve channel from the provided handle.');
    }

    const resolvedId =
      pipedData.id || pipedData.channelId || pipedData.channelID || pipedData.uploaderId;

    if (!resolvedId) {
      throw new Error('Piped API response did not include a channel identifier.');
    }

    return { channelId: resolvedId, pipedData };
  }

  async function fetchVideosFromFeed(channelId) {
    const encodedId = encodeURIComponent(channelId);
    const endpoints = [
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodedId}`,
      `https://cors.isomorphic-git.org/https://www.youtube.com/feeds/videos.xml?channel_id=${encodedId}`,
      `https://r.jina.ai/https://www.youtube.com/feeds/videos.xml?channel_id=${encodedId}`
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (!response.ok) {
          continue;
        }

        const xml = await response.text();
        const parsed = parseFeed(xml);
        if (parsed.length) {
          return parsed;
        }
      } catch (error) {
        // Try the next endpoint
      }
    }

    throw new Error('All YouTube feed requests failed.');
  }

  function parseFeed(xmlText) {
    if (!xmlText) {
      return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Failed to parse YouTube feed XML.');
    }

    const entries = Array.from(doc.querySelectorAll('entry'));

    return entries.map((entry) => {
      const videoId = entry.querySelector('yt\\:videoId')?.textContent?.trim() || '';
      const linkHref = entry.querySelector('link')?.getAttribute('href') || '';
      const titleText = entry.querySelector('title')?.textContent?.trim() || 'Untitled video';
      const thumbnailNode = entry.querySelector('media\\:thumbnail, thumbnail');
      const thumbnailUrl =
        thumbnailNode?.getAttribute('url') || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
      const published =
        entry.querySelector('published')?.textContent?.trim() ||
        entry.querySelector('updated')?.textContent?.trim() ||
        '';

      return {
        id: videoId,
        title: titleText,
        url: linkHref || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#'),
        thumbnail: thumbnailUrl,
        publishedAt: published,
        displayPublished: formatPublished(published)
      };
    });
  }

  function createVideoCard(video, pillLabel) {
    const link = document.createElement('a');
    link.className = 'card';
    link.href = video.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';

    if (video.title) {
      link.setAttribute('aria-label', `${video.title} on YouTube`);
    }

    const img = document.createElement('img');
    img.src = video.thumbnail || (video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : '');
    img.alt = video.title ? `${video.title} thumbnail` : 'YouTube video thumbnail';
    link.appendChild(img);

    const pad = document.createElement('div');
    pad.className = 'pad';
    link.appendChild(pad);

    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = pillLabel;
    pad.appendChild(pill);

    const title = document.createElement('div');
    title.className = 'thq-heading-3';
    title.textContent = video.title || 'Untitled video';
    pad.appendChild(title);

    const metaText = video.displayPublished || '';
    if (metaText) {
      const meta = document.createElement('div');
      meta.className = 'video-card__meta';
      meta.textContent = `Published ${metaText}`;
      pad.appendChild(meta);
    }

    return link;
  }

  async function fetchPipedData(identifiers) {
    const queue = [];

    (identifiers || []).forEach((identifier) => {
      const trimmed = (identifier || '').trim();
      if (!trimmed) {
        return;
      }

      queue.push(trimmed);

      if (trimmed.startsWith('@')) {
        queue.push(trimmed.slice(1));
      } else if (!trimmed.startsWith('UC')) {
        queue.push(`@${trimmed}`);
      }
    });

    const tried = new Set();

    for (const candidate of queue) {
      const value = candidate.trim();
      if (!value || tried.has(value)) {
        continue;
      }

      tried.add(value);

      try {
        const data = await fetchPipedChannel(value);
        if (data) {
          return data;
        }
      } catch (error) {
        // Try the next identifier option
      }
    }

    return null;
  }

  async function fetchPipedChannel(identifier) {
    const endpoint = `https://piped.video/api/v1/channel/${encodeURIComponent(identifier)}`;
    const response = await fetch(endpoint, { credentials: 'omit' });

    if (!response.ok) {
      throw new Error(`Piped API request failed with status ${response.status}`);
    }

    return response.json();
  }

  function extractVideosFromPiped(pipedData) {
    if (!pipedData) {
      return [];
    }

    const collections = [];

    if (Array.isArray(pipedData.relatedStreams)) {
      collections.push(pipedData.relatedStreams);
    }

    if (Array.isArray(pipedData.latestVideos)) {
      collections.push(pipedData.latestVideos);
    }

    if (Array.isArray(pipedData.videos)) {
      collections.push(pipedData.videos);
    }

    if (Array.isArray(pipedData.items)) {
      collections.push(pipedData.items);
    }

    const results = [];
    const seen = new Set();

    collections.forEach((list) => {
      list.forEach((item) => {
        const normalized = normalizePipedStream(item);
        if (!normalized) {
          return;
        }

        const key = normalized.id || normalized.url;
        if (!key || seen.has(key)) {
          return;
        }

        seen.add(key);
        results.push(normalized);
      });
    });

    return results;
  }

  function normalizePipedStream(stream) {
    if (!stream) {
      return null;
    }

    const rawUrl = stream.url || stream.watchUrl || stream.originUrl || '';
    const videoId = stream.id || stream.videoId || extractVideoIdFromUrl(rawUrl);
    const url = rawUrl
      ? rawUrl.startsWith('http')
        ? rawUrl
        : `https://www.youtube.com${rawUrl}`
      : videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : '';

    if (!url) {
      return null;
    }

    const thumbnail =
      stream.thumbnail || stream.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    const title = stream.title || stream.name || '';
    const publishedInfo = parsePipedPublished(stream);

    return {
      id: videoId || '',
      title,
      url,
      thumbnail,
      publishedAt: publishedInfo.iso,
      displayPublished: publishedInfo.display
    };
  }

  function parsePipedPublished(stream) {
    const raw =
      stream.uploaded ??
      stream.uploadedDate ??
      stream.published ??
      stream.publishedAt ??
      stream.date;
    const textFallback = stream.uploadedText || stream.publishedText || stream.publishedTimeText || '';
    const parsed = parseDate(raw);

    if (parsed) {
      return {
        iso: parsed.toISOString(),
        display: formatPublished(parsed)
      };
    }

    return {
      iso: '',
      display: textFallback || (typeof raw === 'string' ? raw : '')
    };
  }

  function formatPublished(value) {
    const date = value instanceof Date ? value : parseDate(value);

    if (!date) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return date.toISOString().split('T')[0];
    }
  }

  function parseDate(value) {
    if (!value && value !== 0) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const ms = value > 1e12 ? value : value * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        const ms = trimmed.length > 10 ? num : num * 1000;
        const date = new Date(ms);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      const parsed = Date.parse(trimmed);
      if (!Number.isNaN(parsed)) {
        const date = new Date(parsed);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }

    return null;
  }

  function extractVideoIdFromUrl(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();
    if (!trimmed) {
      return '';
    }

    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return watchMatch[1];
    }

    const youtuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (youtuMatch) {
      return youtuMatch[1];
    }

    const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      return embedMatch[1];
    }

    const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    return '';
  }
})();
