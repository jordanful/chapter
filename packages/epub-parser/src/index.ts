import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { load as loadHTML } from 'cheerio';
import { decode as decodeHTML } from 'he';

export interface EPUBMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  description?: string;
  isbn?: string;
  language?: string;
  coverData?: Buffer;
  [key: string]: any;
}

export interface EPUBChapter {
  index: number;
  title?: string;
  href: string;
  htmlContent: string;
  textContent: string;
}

export interface EPUBStructure {
  metadata: EPUBMetadata;
  chapters: EPUBChapter[];
  totalWords: number;
  totalCharacters: number;
}

export async function parseEPUB(buffer: Buffer): Promise<EPUBStructure> {
  const zip = await JSZip.loadAsync(buffer);

  const containerXML = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXML) {
    throw new Error('Invalid EPUB: container.xml not found');
  }

  const container = await parseXML(containerXML);
  const opfPath = container.container.rootfiles[0].rootfile[0].$['full-path'];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  const opfXML = await zip.file(opfPath)?.async('text');
  if (!opfXML) {
    throw new Error('Invalid EPUB: OPF file not found');
  }

  const opf = await parseXML(opfXML);
  const pkg = opf.package;

  const metadata = extractMetadata(pkg.metadata[0]);

  let coverData: Buffer | undefined;
  try {
    const coverItem = pkg.manifest[0].item.find(
      (item: any) =>
        item.$.properties === 'cover-image' || item.$.id === 'cover' || item.$.id === 'cover-image'
    );
    if (coverItem) {
      const coverPath = opfDir + coverItem.$.href;
      coverData = await zip.file(coverPath)?.async('nodebuffer');
    }
  } catch (error) {
    console.warn('Could not extract cover image:', error);
  }

  if (coverData) {
    metadata.coverData = coverData;
  }

  const spine = pkg.spine[0].itemref || [];
  const manifest = pkg.manifest[0].item;

  const chapters: EPUBChapter[] = [];
  let totalWords = 0;
  let totalCharacters = 0;

  for (let i = 0; i < spine.length; i++) {
    const itemref = spine[i];
    const idref = itemref.$.idref;

    const manifestItem = manifest.find((item: any) => item.$.id === idref);
    if (!manifestItem) continue;

    const href = manifestItem.$.href;
    const fullPath = opfDir + href;

    const htmlContent = await zip.file(fullPath)?.async('text');
    if (!htmlContent) continue;

    const { text, html } = parseHTML(htmlContent);

    const title = extractTitle(html) || manifestItem.$['title'] || undefined;

    const wordCount = countWords(text);
    totalWords += wordCount;
    totalCharacters += text.length;

    chapters.push({
      index: i,
      title,
      href,
      htmlContent: html,
      textContent: text,
    });
  }

  return {
    metadata,
    chapters,
    totalWords,
    totalCharacters,
  };
}

function parseXML(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, { trim: true, normalizeTags: true }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function extractMetadata(meta: any): EPUBMetadata {
  const getValue = (key: string) => {
    const value = meta[`dc:${key}`]?.[0];
    if (!value) return undefined;
    return typeof value === 'string' ? value : value._ || value;
  };

  return {
    title: getValue('title'),
    author: getValue('creator'),
    publisher: getValue('publisher'),
    description: getValue('description'),
    isbn: getValue('identifier'),
    language: getValue('language'),
  };
}

function parseHTML(html: string): { text: string; html: string } {
  const decoded = decodeHTML(html);

  const $ = loadHTML(decoded, {
    xmlMode: false,
  });

  $('script, style, nav, header, footer').remove();

  const cleanHTML = $('body').html() || decoded;

  // Convert HTML to text while preserving paragraph structure
  let text = cleanHTML;

  // Replace block-level closing tags with double newlines (paragraph boundaries)
  const blockElements = [
    'p',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
    'tr',
    'section',
    'article',
    'aside',
    'blockquote',
    'pre',
    'figure',
    'figcaption',
    'address',
    'main',
    'dt',
    'dd',
    'ul',
    'ol',
    'dl',
    'table',
  ];
  const blockRegex = new RegExp(`</(${blockElements.join('|')})>`, 'gi');
  text = text.replace(blockRegex, '\n\n');

  // Replace <br> with single newline
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode any remaining HTML entities
  text = decodeHTML(text);

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, ' '); // Collapse horizontal spaces only
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  text = text.replace(/\n +\n/g, '\n\n'); // Clean up lines that are just spaces
  text = text.replace(/^ +| +$/gm, ''); // Trim each line
  text = text.trim();

  return { text, html: cleanHTML };
}

function extractTitle(html: string): string | undefined {
  const $ = loadHTML(html);

  const title =
    $('h1').first().text() ||
    $('h2').first().text() ||
    $('title').first().text() ||
    $('h3').first().text();

  return title.trim() || undefined;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
