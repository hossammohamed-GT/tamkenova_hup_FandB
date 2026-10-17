import { describe, expect, it } from 'vitest';
import { youtubeVideoId } from './youtube';
describe('YouTube URL validation', () => {
  it.each([
    'https://youtu.be/5BciHXh074k?list=RD5BciHXh074k',
    'https://www.youtube.com/watch?v=5BciHXh074k&list=other',
    'https://m.youtube.com/watch?v=5BciHXh074k',
    'https://www.youtube.com/embed/5BciHXh074k',
    'https://www.youtube-nocookie.com/embed/5BciHXh074k',
    'https://youtube.com/shorts/5BciHXh074k',
    'https://youtube.com/live/5BciHXh074k',
    '5BciHXh074k',
  ])('accepts a single video from %s', (url) => expect(youtubeVideoId(url)).toBe('5BciHXh074k'));
  it.each([
    'javascript:alert(1)',
    'https://youtube.com.evil.test/watch?v=5BciHXh074k',
    'https://evil.test/5BciHXh074k',
    'https://youtu.be/invalid',
    'https://youtube.com/playlist?list=RD5BciHXh074k',
    'https://user:pass@youtube.com/watch?v=5BciHXh074k',
    'https://youtube.com:8443/embed/5BciHXh074k',
    '<iframe src="https://youtube.com"></iframe>',
    null,
    undefined,
  ])('rejects %s', (url) => expect(youtubeVideoId(url)).toBeNull());
});
