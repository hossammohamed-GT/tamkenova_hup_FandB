/** Only known YouTube URLs/IDs may enter the trusted iframe URL. */
export function youtubeVideoId(value?: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port)
      return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (['youtu.be', 'www.youtu.be'].includes(host) && parts.length === 1) id = parts[0];
    else if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
      ].includes(host)
    ) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1];
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
