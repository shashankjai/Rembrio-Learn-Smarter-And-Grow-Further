/**
 * Tiny, dependency-free parser for the light Markdown that models tend to produce
 * (paragraphs, "-"/"*" bullets, "1." lists, **bold**, *italic*, `code`).
 * It returns a plain data structure; React renders it as elements, so no HTML is ever injected.
 */
export function parseInline(text) {
  const parts = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) parts.push({ type: 'bold', value: tok.slice(2, -2) });
    else if (tok.startsWith('`')) parts.push({ type: 'code', value: tok.slice(1, -1) });
    else parts.push({ type: 'italic', value: tok.slice(1, -1) });
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

export function parseBlocks(text) {
  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (!list || list.type !== kind) {
        flush();
        list = { type: kind, items: [] };
      }
      list.items.push(parseInline((bullet || numbered)[1]));
    } else if (!line.trim()) {
      flush();
    } else {
      flush();
      const last = blocks[blocks.length - 1];
      // Consecutive plain lines form one paragraph.
      if (last && last.type === 'p' && last.open) last.inline.push({ type: 'text', value: ' ' }, ...parseInline(line.trim()));
      else blocks.push({ type: 'p', inline: parseInline(line.trim()), open: true });
    }
  }
  flush();
  return blocks.map(({ open, ...b }) => b); // eslint-disable-line no-unused-vars
}
