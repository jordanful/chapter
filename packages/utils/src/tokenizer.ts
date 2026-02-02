import { Token } from '@chapter/types';

/**
 * Tokenizes text into words, punctuation, and whitespace
 * Preserves exact character positions for each token
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let currentPosition = 0;

  // Regex to match words, punctuation, or whitespace
  const tokenRegex = /(\w+)|([^\w\s])|(\s+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const [fullMatch, word, punctuation, whitespace] = match;
    const start = match.index;
    const end = start + fullMatch.length;

    let type: Token['type'];
    if (word) {
      type = 'word';
    } else if (punctuation) {
      type = 'punctuation';
    } else {
      type = 'whitespace';
    }

    tokens.push({
      text: fullMatch,
      start,
      end,
      type,
    });

    currentPosition = end;
  }

  return tokens;
}

/**
 * Count words in text (excludes punctuation and whitespace)
 */
export function countWords(text: string): number {
  return tokenize(text).filter((token) => token.type === 'word').length;
}

/**
 * Get word at specific character position
 */
export function getTokenAtPosition(tokens: Token[], charPosition: number): Token | null {
  return tokens.find((token) => token.start <= charPosition && token.end > charPosition) || null;
}

/**
 * Get token index at specific character position
 */
export function getTokenIndexAtPosition(tokens: Token[], charPosition: number): number {
  const index = tokens.findIndex(
    (token) => token.start <= charPosition && token.end > charPosition
  );
  return index >= 0 ? index : tokens.length - 1;
}

/**
 * Convert token index to character position (start of token)
 */
export function tokenIndexToCharPosition(tokens: Token[], tokenIndex: number): number {
  if (tokenIndex < 0 || tokenIndex >= tokens.length) {
    return 0;
  }
  return tokens[tokenIndex].start;
}
