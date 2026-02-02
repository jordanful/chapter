export interface BookMetadata {
  title: string;
  author?: string;
  isbn?: string;
  language?: string;
  publisher?: string;
  description?: string;
  coverData?: Buffer;
}

export interface ChapterData {
  index: number;
  title?: string;
  href: string;
  htmlContent: string;
  textContent: string;
}

export interface Token {
  text: string;
  start: number; // Character offset from paragraph start
  end: number; // Character offset from paragraph end
  type: 'word' | 'punctuation' | 'whitespace';
}

export interface ParagraphData {
  index: number;
  text: string;
  tokens: Token[];
  startPosition: number; // Global character offset
  endPosition: number;
  wordCount: number;
}

export interface BookStructure {
  metadata: BookMetadata;
  chapters: ChapterData[];
  totalWords: number;
  totalCharacters: number;
}

export interface EPUBFile {
  path: string;
  data: Buffer;
}

export interface AlternativeCover {
  isbn?: string;
  coverUrl: string;
  editionTitle?: string;
  year?: string;
}
