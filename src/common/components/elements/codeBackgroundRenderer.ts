import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';
import createElement from 'react-syntax-highlighter/dist/cjs/create-element';

import type { CodeBackgroundRange } from '@/common/libs/codeBackgrounds';

type HighlightRenderer = NonNullable<SyntaxHighlighterProps['renderer']>;
type HighlightNode = Parameters<HighlightRenderer>[0]['rows'][number];

export const codeBackgroundRenderer =
  (ranges: CodeBackgroundRange[]): HighlightRenderer =>
  ({ rows, stylesheet, useInlineStyles }) => {
    let offset = 0;
    let rangeIndex = 0;
    const visit = (node: HighlightNode): HighlightNode[] => {
      if (node.type !== 'text') {
        return [{ ...node, children: (node.children || []).flatMap(visit) }];
      }
      const value = String(node.value ?? '');
      const nodes: HighlightNode[] = [];
      let from = 0;
      while (from < value.length) {
        const position = offset + from;
        let range = ranges[rangeIndex];
        while (range && range[1] <= position) range = ranges[++rangeIndex];
        const colored = range !== undefined && range[0] <= position;
        const to = Math.min(
          value.length,
          range ? (colored ? range[1] : range[0]) - offset : value.length,
        );
        const leaf: HighlightNode = {
          type: 'text',
          value: value.slice(from, to),
        };
        nodes.push(
          colored && range
            ? {
                type: 'element',
                tagName: 'span',
                properties: { className: [`feishu-code-bg-${range[2]}`] },
                children: [leaf],
              }
            : leaf,
        );
        from = to;
      }
      offset += value.length;
      return nodes;
    };
    return rows
      .flatMap(visit)
      .map((node, key) =>
        createElement({ node, key, stylesheet, useInlineStyles }),
      );
  };
