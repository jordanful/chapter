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

/**
 * Parse EPUB file and extract structure
 */
export async function parseEPUB(buffer: Buffer): Promise<EPUBStructure> {
  const zip = await JSZip.loadAsync(buffer);

  // Find and parse container.xml to get OPF file path
  const containerXML = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXML) {
    throw new Error('Invalid EPUB: container.xml not found');
  }

  const container = await parseXML(containerXML);
  const opfPath = container.container.rootfiles[0].rootfile[0].$['full-path'];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  // Parse OPF file
  const opfXML = await zip.file(opfPath)?.async('text');
  if (!opfXML) {
    throw new Error('Invalid EPUB: OPF file not found');
  }

  const opf = await parseXML(opfXML);
  const pkg = opf.package;

  // Extract metadata
  const metadata = extractMetadata(pkg.metadata[0]);

  // Extract cover image
  let coverData: Buffer | undefined;
  try {
    const coverItem = pkg.manifest[0].item.find((item: any) =>
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

  // Get spine (reading order)
  const spine = pkg.spine[0].itemref || [];
  const manifest = pkg.manifest[0].item;

  // Extract chapters in reading order
  const chapters: EPUBChapter[] = [];
  let totalWords = 0;
  let totalCharacters = 0;

  for (let i = 0; i < spine.length; i++) {
    const itemref = spine[i];
    const idref = itemref.$.idref;

    // Find corresponding manifest item
    const manifestItem = manifest.find((item: any) => item.$.id === idref);
    if (!manifestItem) continue;

    const href = manifestItem.$.href;
    const fullPath = opfDir + href;

    // Read chapter HTML
    const htmlContent = await zip.file(fullPath)?.async('text');
    if (!htmlContent) continue;

    // Parse and clean HTML
    const { text, html } = parseHTML(htmlContent);

    // Extract title from HTML or use spine label
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

/**
 * Parse XML string to object
 */
function parseXML(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, { trim: true, normalizeTags: true }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Extract metadata from OPF
 */
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

/**
 * Parse HTML and extract clean text
 */
function parseHTML(html: string): { text: string; html: string } {
  // Decode HTML entities first
  const decoded = decodeHTML(html);

  // Load with cheerio
  const $ = loadHTML(decoded, {
    xmlMode: false,
  });

  // Remove script, style, and other non-content tags
  $('script, style, nav, header, footer').remove();

  // Get cleaned HTML
  const cleanHTML = $('body').html() || decoded;

  // Extract text content
  const text = $('body')
    .text()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Normalize newlines
    .trim();

  return { text, html: cleanHTML };
}

/**
 * Extract chapter title from HTML
 */
function extractTitle(html: string): string | undefined {
  const $ = loadHTML(html);

  // Try h1, h2, title, or first heading
  const title =
    $('h1').first().text() ||
    $('h2').first().text() ||
    $('title').first().text() ||
    $('h3').first().text();

  return title.trim() || undefined;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}
