/**
 * Text Cleanup Utilities
 *
 * Fixes common character encoding issues from EPUBs
 */

/**
 * Fix common UTF-8 encoding issues
 */
export function fixEncodingIssues(text: string): string {
  return text
    // Fix em dash (—)
    .replace(/�/g, '—')
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '—')

    // Fix en dash (–)
    .replace(/â€"/g, '–')

    // Fix smart quotes
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€˜/g, "'")
    .replace(/â€™/g, "'")

    // Fix ellipsis
    .replace(/â€¦/g, '…')

    // Fix other common issues
    .replace(/Â/g, '')
    .replace(/â€¢/g, '•')

    // Remove any remaining replacement characters
    .replace(/\uFFFD/g, '—');
}
