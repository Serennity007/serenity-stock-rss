import { describe, expect, it } from 'vitest';
import { platformOf } from '../src/platform';

describe('platformOf', () => {
  it('reads the platform from the link, and treats lookalikes and bad links as web', () => {
    expect(platformOf('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(platformOf('https://youtu.be/abc')).toBe('youtube');
    expect(platformOf('https://www.bilibili.com/video/BV1cSec6tEux/')).toBe('bilibili');
    expect(platformOf('https://mp.weixin.qq.com/s/xyz')).toBe('wechat');
    expect(platformOf('https://youtube.com.evil.test/watch')).toBe('web');
    expect(platformOf('not a url')).toBe('web');
    expect(platformOf(undefined)).toBe('web');
  });
});
