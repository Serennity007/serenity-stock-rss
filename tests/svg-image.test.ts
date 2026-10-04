// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { sanitizedSvg } from '../src/svg-image';
vi.stubGlobal('createSpan', () => document.createElement('span'));
const bytes = (text: string) => new TextEncoder().encode(text).buffer;
describe('SVG image conversion input', () => {
  it('retains badge text, gradient and chart typography while removing active and external content', () => {
    const result = sanitizedSvg(bytes(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20" onload="alert(1)"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="120" height="20" fill="url(#g)"/><text style="font-size:12px;font-weight:bold" x="4" y="15">License: MIT</text><script>alert(1)</script><foreignObject><div>HTML</div></foreignObject><image href="https://evil.example/image"/><style>@import 'https://evil.example/style';</style><path fill="url(https://evil.example/a)"/><a href="https://evil.example">link</a></svg>`));
    expect(result).toMatchObject({ width:120, height:20 });
    expect(result!.text).toContain('License: MIT'); expect(result!.text).toContain('url(#g)');
    expect(result!.text).toContain('font-size="12px"');
    expect(result!.text).not.toMatch(/onload|<script|foreignObject|<image|<style|evil\.example|href=/i);
  });
  it('handles XML prologs and viewBox-only images and bounds raster dimensions', () => {
    const result = sanitizedSvg(bytes('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8000 4000"><path d="M0 0L8000 4000"/></svg>'));
    expect(result).toMatchObject({width:2048,height:1024});
    expect(result!.text).toContain('viewBox="0 0 8000 4000"');
  });
  it('rejects error pages, malformed XML, entities and impossible image dimensions', () => {
    for (const text of ['<html>Error</html>','not an image','<svg><broken></svg>','<!DOCTYPE svg [<!ENTITY a "boom">]><svg>&a;</svg>','<svg xmlns="http://www.w3.org/2000/svg" width="0" height="20"/>']) expect(sanitizedSvg(bytes(text))).toBeNull();
  });
});
