import createDOMPurify from 'dompurify';

const namespace = 'http://www.w3.org/2000/svg';
const presentation = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline'];

/** Accept an SVG document, never an HTML error page, and remove active/external content before decoding. */
export function sanitizedSvg(data: ArrayBuffer, doc: Document = document): { text: string; width: number; height: number } | null {
  const win = doc.defaultView;
  if (!win) return null;
  const text = new TextDecoder().decode(data);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return null;
  const parser = new win.DOMParser(), source = parser.parseFromString(text, 'image/svg+xml');
  const root = source.documentElement;
  if (source.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI && root.namespaceURI !== namespace) return null;
  if (root.querySelectorAll('*').length > 10000) return null;
  root.setAttribute('xmlns', namespace);
  // Preserve common badge/chart typography without retaining arbitrary CSS or stylesheet loads.
  for (const element of [root, ...root.querySelectorAll('[style]')]) {
    const style = createSpan().style; style.cssText = element.getAttribute('style') || '';
    for (const property of presentation) {
      const value = style.getPropertyValue(property);
      if (value && !/url\s*\(|[\\@]/i.test(value)) element.setAttribute(property, value);
    }
  }
  const purifier = createDOMPurify(win);
  purifier.addHook('uponSanitizeAttribute', (_node, attribute) => {
    if (['href', 'xlink:href', 'xml:base'].includes(attribute.attrName) || /url\s*\(/i.test(attribute.attrValue) && !/^url\(\s*["']?#[\w.-]+["']?\s*\)$/i.test(attribute.attrValue)) attribute.keepAttr = false;
  });
  const clean = purifier.sanitize(root.outerHTML, {
    NAMESPACE: namespace, USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['style', 'image', 'feImage', 'use', 'foreignObject', 'animate', 'animateTransform', 'set'],
    FORBID_ATTR: ['style'], ALLOW_DATA_ATTR: false,
  });
  const svg = parser.parseFromString(clean, 'image/svg+xml').documentElement;
  if (svg.localName !== 'svg' || svg.namespaceURI !== namespace) return null;
  const box = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const size = (value: string | null, fallback: number) => value && /^\d+(?:\.\d+)?(?:px)?$/.test(value) ? parseFloat(value) : fallback;
  const width = size(svg.getAttribute('width'), box.length === 4 ? box[2] : 300);
  const height = size(svg.getAttribute('height'), box.length === 4 ? box[3] : 150);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, 2048 / width, 2048 / height);
  const outputWidth = Math.max(1, Math.round(width * scale)), outputHeight = Math.max(1, Math.round(height * scale));
  svg.setAttribute('width', String(outputWidth)); svg.setAttribute('height', String(outputHeight));
  if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return { text: new win.XMLSerializer().serializeToString(svg), width: outputWidth, height: outputHeight };
}

/** Raster output keeps SVGs on the existing bounded image-cache, drag and export paths. */
export async function svgPng(data: ArrayBuffer): Promise<ArrayBuffer | null> {
  const svg = sanitizedSvg(data);
  if (!svg) return null;
  const url = URL.createObjectURL(new Blob([svg.text], { type: 'image/svg+xml' }));
  const img = createEl('img');
  let timer: number | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = window.setTimeout(() => reject(new Error('SVG decode timeout')), 10000);
      img.onload = () => resolve(); img.onerror = () => reject(new Error('SVG decode failed')); img.src = url;
    });
    const canvas = createEl('canvas'); canvas.width = svg.width; canvas.height = svg.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(img, 0, 0, svg.width, svg.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob ? await blob.arrayBuffer() : null;
  } finally { window.clearTimeout(timer); img.onload = null; img.onerror = null; img.removeAttribute('src'); URL.revokeObjectURL(url); }
}
