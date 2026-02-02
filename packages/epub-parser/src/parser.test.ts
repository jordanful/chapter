import { describe, it, expect } from 'vitest';
import { EPUBParser } from './parser';

describe('EPUBParser', () => {
  describe('htmlToText', () => {
    it('should convert HTML to plain text', async () => {
      const parser = new EPUBParser();
      const html = '<p>Hello <strong>world</strong>!</p>';

      // Access private method for testing
      const text = (parser as any).htmlToText(html);

      expect(text).toContain('Hello world!');
    });

    it('should remove script tags', () => {
      const parser = new EPUBParser();
      const html = '<p>Text</p><script>alert("bad")</script>';

      const text = (parser as any).htmlToText(html);

      expect(text).not.toContain('alert');
      expect(text).toContain('Text');
    });

    it('should remove style tags', () => {
      const parser = new EPUBParser();
      const html = '<p>Text</p><style>body { color: red; }</style>';

      const text = (parser as any).htmlToText(html);

      expect(text).not.toContain('color');
      expect(text).toContain('Text');
    });

    it('should replace block elements with newlines', () => {
      const parser = new EPUBParser();
      const html = '<p>Para 1</p><p>Para 2</p>';

      const text = (parser as any).htmlToText(html);

      expect(text).toContain('Para 1');
      expect(text).toContain('Para 2');
      // Should have newline between paragraphs
      expect(text.split('\n').length).toBeGreaterThan(1);
    });

    it('should handle br tags', () => {
      const parser = new EPUBParser();
      const html = '<p>Line 1<br/>Line 2</p>';

      const text = (parser as any).htmlToText(html);

      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
    });

    it('should decode HTML entities', () => {
      const parser = new EPUBParser();
      const html = '<p>&amp; &lt; &gt; &quot; &#39;</p>';

      const text = (parser as any).htmlToText(html);

      expect(text).toContain('&');
      expect(text).toContain('<');
      expect(text).toContain('>');
      expect(text).toContain('"');
      expect(text).toContain("'");
    });

    it('should normalize whitespace', () => {
      const parser = new EPUBParser();
      const html = '<p>Hello    world</p>';

      const text = (parser as any).htmlToText(html);

      expect(text).toBe('Hello world');
    });

    it('should collapse multiple newlines', () => {
      const parser = new EPUBParser();
      const html = '<p>Para 1</p><br/><br/><br/><p>Para 2</p>';

      const text = (parser as any).htmlToText(html);

      // Should have max 2 consecutive newlines
      expect(text).not.toContain('\n\n\n');
    });
  });

  describe('stripHtml', () => {
    it('should strip HTML tags', () => {
      const parser = new EPUBParser();
      const html = '<strong>Bold</strong> text';

      const text = (parser as any).stripHtml(html);

      expect(text).toBe('Bold text');
    });

    it('should handle nested tags', () => {
      const parser = new EPUBParser();
      const html = '<div><p><strong>Text</strong></p></div>';

      const text = (parser as any).stripHtml(html);

      expect(text).toBe('Text');
    });
  });

  describe('decodeHtmlEntities', () => {
    it('should decode common HTML entities', () => {
      const parser = new EPUBParser();

      expect((parser as any).decodeHtmlEntities('&amp;')).toBe('&');
      expect((parser as any).decodeHtmlEntities('&lt;')).toBe('<');
      expect((parser as any).decodeHtmlEntities('&gt;')).toBe('>');
      expect((parser as any).decodeHtmlEntities('&quot;')).toBe('"');
      expect((parser as any).decodeHtmlEntities('&#39;')).toBe("'");
      expect((parser as any).decodeHtmlEntities('&nbsp;')).toBe(' ');
    });

    it('should handle multiple entities', () => {
      const parser = new EPUBParser();
      const text = 'A &amp; B &lt; C';

      const decoded = (parser as any).decodeHtmlEntities(text);

      expect(decoded).toBe('A & B < C');
    });

    it('should leave unknown entities unchanged', () => {
      const parser = new EPUBParser();
      const text = '&unknown;';

      const decoded = (parser as any).decodeHtmlEntities(text);

      expect(decoded).toBe('&unknown;');
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative paths', () => {
      const parser = new EPUBParser();
      (parser as any).opfDir = 'OEBPS/';

      const resolved = (parser as any).resolvePath('chapter1.html');

      expect(resolved).toBe('OEBPS/chapter1.html');
    });

    it('should remove anchors', () => {
      const parser = new EPUBParser();
      (parser as any).opfDir = '';

      const resolved = (parser as any).resolvePath('chapter1.html#section');

      expect(resolved).toBe('chapter1.html');
    });

    it('should handle absolute paths', () => {
      const parser = new EPUBParser();
      (parser as any).opfDir = 'OEBPS/';

      const resolved = (parser as any).resolvePath('/chapter1.html');

      expect(resolved).toBe('chapter1.html');
    });
  });

  describe('extractChapterTitle', () => {
    it('should extract title from h1 tag', () => {
      const parser = new EPUBParser();
      const html = '<h1>Chapter 1: The Beginning</h1><p>Text...</p>';

      const title = (parser as any).extractChapterTitle(html);

      expect(title).toBe('Chapter 1: The Beginning');
    });

    it('should extract title from h2 tag if no h1', () => {
      const parser = new EPUBParser();
      const html = '<h2>Introduction</h2><p>Text...</p>';

      const title = (parser as any).extractChapterTitle(html);

      expect(title).toBe('Introduction');
    });

    it('should extract title from title tag if no headings', () => {
      const parser = new EPUBParser();
      const html = '<title>Chapter Title</title><p>Text...</p>';

      const title = (parser as any).extractChapterTitle(html);

      expect(title).toBe('Chapter Title');
    });

    it('should return undefined if no title found', () => {
      const parser = new EPUBParser();
      const html = '<p>Just text...</p>';

      const title = (parser as any).extractChapterTitle(html);

      expect(title).toBeUndefined();
    });

    it('should strip HTML from title', () => {
      const parser = new EPUBParser();
      const html = '<h1>Chapter <em>One</em></h1>';

      const title = (parser as any).extractChapterTitle(html);

      expect(title).toBe('Chapter One');
    });
  });
});
