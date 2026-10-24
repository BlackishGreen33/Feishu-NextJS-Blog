import type { Root, RootContent } from 'hast';

const plainText = (node: RootContent): string => {
  if (node.type === 'text') return node.value;
  if (node.type === 'element' && node.tagName === 'img')
    return String(node.properties.alt || '');
  return 'children' in node ? node.children.map(plainText).join('') : '';
};

export default function rehypeArticleHeadings() {
  return (tree: Root) => {
    const used = new Set<string>();
    const visit = (node: RootContent) => {
      if (
        node.type !== 'element' ||
        node.tagName === 'pre' ||
        node.tagName === 'code'
      )
        return;
      if (/^h[1-3]$/.test(node.tagName)) {
        const label = plainText(node).replace(/\s+/g, ' ').trim();
        if (label) {
          const slug =
            label
              .normalize('NFKC')
              .toLowerCase()
              .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
              .trim()
              .replace(/\s+/g, '-') || 'section';
          const base = `article-section-${slug}`;
          let id = base;
          for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
          used.add(id);
          node.properties.id = id;
          node.properties['data-toc-label'] = label;
        }
      }
      node.children.forEach(visit);
    };
    tree.children.forEach(visit);
  };
}
