import { describe, it, expect } from 'vitest';
import {
  tokenize,
  countWords,
  getTokenAtPosition,
  getTokenIndexAtPosition,
  tokenIndexToCharPosition,
} from './tokenizer';

describe('tokenizer', () => {
  describe('tokenize', () => {
    it('should tokenize simple text into words', () => {
      const tokens = tokenize('Hello world');

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ text: 'Hello', start: 0, end: 5, type: 'word' });
      expect(tokens[1]).toEqual({ text: ' ', start: 5, end: 6, type: 'whitespace' });
      expect(tokens[2]).toEqual({ text: 'world', start: 6, end: 11, type: 'word' });
    });

    it('should tokenize text with punctuation', () => {
      const tokens = tokenize('Hello, world!');

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe('word');
      expect(tokens[1].type).toBe('punctuation');
      expect(tokens[1].text).toBe(',');
      expect(tokens[2].type).toBe('whitespace');
      expect(tokens[3].type).toBe('word');
      expect(tokens[4].type).toBe('punctuation');
      expect(tokens[4].text).toBe('!');
    });

    it('should preserve exact character positions', () => {
      const text = 'The quick brown fox.';
      const tokens = tokenize(text);

      // Verify each token's position matches the original text
      tokens.forEach((token) => {
        expect(text.substring(token.start, token.end)).toBe(token.text);
      });
    });

    it('should handle multiple spaces', () => {
      const tokens = tokenize('Hello  world');

      expect(tokens[1].text).toBe('  ');
      expect(tokens[1].type).toBe('whitespace');
    });

    it('should handle empty string', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(0);
    });

    it('should handle text with only whitespace', () => {
      const tokens = tokenize('   ');

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('whitespace');
    });

    it('should handle numbers as words', () => {
      const tokens = tokenize('Chapter 42');

      expect(tokens[0].text).toBe('Chapter');
      expect(tokens[0].type).toBe('word');
      expect(tokens[2].text).toBe('42');
      expect(tokens[2].type).toBe('word');
    });

    it('should handle contractions', () => {
      const tokens = tokenize("It's working");

      // "It's" should be tokenized as "It", "'", "s"
      expect(tokens[0].text).toBe('It');
      expect(tokens[1].text).toBe("'");
      expect(tokens[1].type).toBe('punctuation');
      expect(tokens[2].text).toBe('s');
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('The quick brown fox')).toBe(4);
    });

    it('should exclude punctuation from word count', () => {
      expect(countWords('Hello, world!')).toBe(2);
    });

    it('should handle empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('should handle only punctuation', () => {
      expect(countWords('...')).toBe(0);
    });
  });

  describe('getTokenAtPosition', () => {
    it('should find token at given position', () => {
      const tokens = tokenize('Hello world');

      const token = getTokenAtPosition(tokens, 2);
      expect(token?.text).toBe('Hello');
    });

    it('should find whitespace token', () => {
      const tokens = tokenize('Hello world');

      const token = getTokenAtPosition(tokens, 5);
      expect(token?.type).toBe('whitespace');
    });

    it('should handle position at end of text', () => {
      const tokens = tokenize('Hello');

      const token = getTokenAtPosition(tokens, 4);
      expect(token?.text).toBe('Hello');
    });

    it('should return null for position out of range', () => {
      const tokens = tokenize('Hello');

      const token = getTokenAtPosition(tokens, 100);
      expect(token).toBeNull();
    });
  });

  describe('getTokenIndexAtPosition', () => {
    it('should find token index at given position', () => {
      const tokens = tokenize('Hello world');

      expect(getTokenIndexAtPosition(tokens, 0)).toBe(0); // 'Hello'
      expect(getTokenIndexAtPosition(tokens, 5)).toBe(1); // ' '
      expect(getTokenIndexAtPosition(tokens, 6)).toBe(2); // 'world'
    });

    it('should return last index for position beyond text', () => {
      const tokens = tokenize('Hello');

      expect(getTokenIndexAtPosition(tokens, 100)).toBe(0);
    });
  });

  describe('tokenIndexToCharPosition', () => {
    it('should convert token index to character position', () => {
      const tokens = tokenize('Hello world');

      expect(tokenIndexToCharPosition(tokens, 0)).toBe(0);  // 'Hello'
      expect(tokenIndexToCharPosition(tokens, 1)).toBe(5);  // ' '
      expect(tokenIndexToCharPosition(tokens, 2)).toBe(6);  // 'world'
    });

    it('should return 0 for invalid index', () => {
      const tokens = tokenize('Hello');

      expect(tokenIndexToCharPosition(tokens, -1)).toBe(0);
      expect(tokenIndexToCharPosition(tokens, 100)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const tokens = tokenize('Café résumé');

      expect(tokens[0].text).toBe('Café');
      expect(tokens[2].text).toBe('résumé');
    });

    it('should handle newlines', () => {
      const tokens = tokenize('Hello\nworld');

      // Newline should be treated as whitespace
      expect(tokens[1].type).toBe('whitespace');
    });

    it('should handle tabs', () => {
      const tokens = tokenize('Hello\tworld');

      expect(tokens[1].type).toBe('whitespace');
    });
  });
});
