import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import { BookMetadata, ChapterData, BookStructure } from '@chapter/types';

interface ContainerXML {
  container: {
    rootfiles: Array<{
      rootfile: Array<{
        $: {
          'full-path': string;
        };
      }>;
    }>;
  };
}

interface PackageDocument {
  package: {
    metadata: Array<{
      'dc:title'?: string[];
      'dc:creator'?: string[];
      'dc:identifier'?: Array<{ _: string }>;
      'dc:language'?: string[];
      'dc:publisher'?: string[];
      'dc:description'?: string[];
    }>;
    manifest: Array<{
      item: Array<{
        $: {
          id: string;
          href: string;
          'media-type': string;
        };
      }>;
    }>;
    spine: Array<{
      itemref: Array<{
        $: {
          idref: string;
        };
      }>;
    }>;
  };
}

export class EPUBParser {
  private zip: JSZip | null = null;
  private opfPath: string = '';
  private opfDir: string = '';

  async parse(epubBuffer: Buffer): Promise<BookStructure> {
    this.zip = await JSZip.loadAsync(epubBuffer);

    // Find OPF file location
    this.opfPath = await this.findOPFPath();
    this.opfDir = this.opfPath.substring(0, this.opfPath.lastIndexOf('/') + 1);

    // Parse OPF document
    const opfContent = await this.readFile(this.opfPath);
    const opf = (await parseStringPromise(opfContent)) as PackageDocument;

    // Extract metadata
    const metadata = this.extractMetadata(opf);

    // Extract cover
    const coverData = await this.extractCover(opf);
    if (coverData) {
      metadata.coverData = coverData;
    }

    // Extract chapters in reading order
    const chapters = await this.extractChapters(opf);

    // Calculate statistics
    let totalWords = 0;
    let totalCharacters = 0;
    for (const chapter of chapters) {
      totalCharacters += chapter.textContent.length;
      totalWords += chapter.textContent.split(/\s+/).filter((w) => w.length > 0).length;
    }

    return {
      metadata,
      chapters,
      totalWords,
      totalCharacters,
    };
  }

  private async findOPFPath(): Promise<string> {
    const containerContent = await this.readFile('META-INF/container.xml');
    const container = (await parseStringPromise(containerContent)) as ContainerXML;
    return container.container.rootfiles[0].rootfile[0].$['full-path'];
  }

  private extractMetadata(opf: PackageDocument): BookMetadata {
    const metadata = opf.package.metadata[0];

    return {
      title: metadata['dc:title']?.[0] || 'Unknown Title',
      author: metadata['dc:creator']?.[0] || undefined,
      isbn: metadata['dc:identifier']?.[0]?._ || undefined,
      language: metadata['dc:language']?.[0] || undefined,
      publisher: metadata['dc:publisher']?.[0] || undefined,
      description: metadata['dc:description']?.[0] || undefined,
    };
  }

  private async extractCover(opf: PackageDocument): Promise<Buffer | undefined> {
    try {
      const manifest = opf.package.manifest[0].item;

      // Try to find cover image
      const coverItem = manifest.find(
        (item) =>
          item.$.id === 'cover' ||
          item.$.id === 'cover-image' ||
          item.$['media-type'].startsWith('image/') && item.$.href.includes('cover')
      );

      if (coverItem) {
        const coverPath = this.resolvePath(coverItem.$.href);
        return await this.readFileAsBuffer(coverPath);
      }
    } catch (error) {
      console.warn('Could not extract cover:', error);
    }
    return undefined;
  }

  private async extractChapters(opf: PackageDocument): Promise<ChapterData[]> {
    const manifest = opf.package.manifest[0].item;
    const spine = opf.package.spine[0].itemref;

    const chapters: ChapterData[] = [];

    for (let i = 0; i < spine.length; i++) {
      const itemref = spine[i];
      const idref = itemref.$.idref;

      const manifestItem = manifest.find((item) => item.$.id === idref);
      if (!manifestItem || !manifestItem.$['media-type'].includes('html')) {
        continue;
      }

      const href = manifestItem.$.href;
      const fullPath = this.resolvePath(href);

      try {
        const htmlContent = await this.readFile(fullPath);
        const textContent = this.htmlToText(htmlContent);

        chapters.push({
          index: i,
          title: this.extractChapterTitle(htmlContent) || `Chapter ${i + 1}`,
          href,
          htmlContent,
          textContent,
        });
      } catch (error) {
        console.warn(`Could not read chapter ${i}:`, error);
      }
    }

    return chapters;
  }

  private extractChapterTitle(html: string): string | undefined {
    // Try to extract title from h1, h2, or title tags
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) return this.stripHtml(h1Match[1]);

    const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
    if (h2Match) return this.stripHtml(h2Match[1]);

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) return this.stripHtml(titleMatch[1]);

    return undefined;
  }

  private htmlToText(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Replace block-level elements with newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Normalize whitespace
    text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    text = text.replace(/[ \t]+/g, ' '); // Collapse spaces
    text = text.trim();

    return text;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim();
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[#a-z0-9]+;/gi, (match) => entities[match] || match);
  }

  private resolvePath(href: string): string {
    // Remove anchor
    href = href.split('#')[0];

    // Resolve relative paths
    if (href.startsWith('/')) {
      return href.substring(1);
    }
    return this.opfDir + href;
  }

  private async readFile(path: string): Promise<string> {
    if (!this.zip) throw new Error('EPUB not loaded');
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return await file.async('string');
  }

  private async readFileAsBuffer(path: string): Promise<Buffer> {
    if (!this.zip) throw new Error('EPUB not loaded');
    const file = this.zip.file(path);
    if (!file) throw new Error(`File not found: ${path}`);
    const arrayBuffer = await file.async('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}

export async function parseEPUB(epubBuffer: Buffer): Promise<BookStructure> {
  const parser = new EPUBParser();
  return await parser.parse(epubBuffer);
}
