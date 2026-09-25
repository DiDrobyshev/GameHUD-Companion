import { VideoItem } from '../types';

export function parseVideoUrl(inputUrl: string): VideoItem | null {
  const url = inputUrl.trim();
  if (!url) return null;

  const id = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      id,
      title: `YouTube Video (${videoId})`,
      url,
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // 2. Twitch
  const twitchChannelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)(?:\/)?$/);
  if (twitchChannelMatch && !['videos', 'directory'].includes(twitchChannelMatch[1])) {
    const channel = twitchChannelMatch[1];
    return {
      id,
      title: `Twitch: ${channel}`,
      url,
      type: 'twitch',
      embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=localhost&autoplay=true`,
    };
  }

  const twitchVideoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (twitchVideoMatch) {
    const videoId = twitchVideoMatch[1];
    return {
      id,
      title: `Twitch VOD (${videoId})`,
      url,
      type: 'twitch',
      embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=localhost&autoplay=true`,
    };
  }

  // 3. VK Video
  if (url.includes('vk.com/video') || url.includes('vkvideo.ru/video')) {
    const vkMatch = url.match(/video(-?\d+)_(\d+)/);
    if (vkMatch) {
      const oid = vkMatch[1];
      const vid = vkMatch[2];
      return {
        id,
        title: `VK Video (${oid}_${vid})`,
        url,
        type: 'vk',
        embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2&autoplay=1`,
      };
    }
  }

  // 4. Local or Direct Video
  const isDirect = /\.(mp4|webm|ogg|m4v|mov)($|\?)/i.test(url);
  if (isDirect) {
    const filename = url.split('/').pop()?.split('?')[0] || 'Прямое видео';
    return {
      id,
      title: decodeURIComponent(filename),
      url,
      type: 'direct',
      embedUrl: url,
    };
  }

  // Fallback: Default direct embed or iframe
  return {
    id,
    title: url.length > 35 ? url.substring(0, 32) + '...' : url,
    url,
    type: 'direct',
    embedUrl: url,
  };
}
