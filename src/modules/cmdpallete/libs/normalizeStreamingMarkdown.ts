const normalizeLine = (line: string) =>
  line
    .replace(/^(#{1,6})([^\s#])/u, '$1 $2')
    .replace(/^(>)([^\s])/u, '$1 $2')
    .replace(/^([*+-])([^\s*+-])/u, '$1 $2')
    .replace(/^(\d+\.)([^\s])/u, '$1 $2');

export const normalizeStreamingMarkdown = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .reduce<{ inCodeBlock: boolean; lines: string[] }>(
      (state, line) => {
        if (line.startsWith('```')) {
          state.lines.push(line);
          state.inCodeBlock = !state.inCodeBlock;
          return state;
        }

        state.lines.push(state.inCodeBlock ? line : normalizeLine(line));
        return state;
      },
      {
        inCodeBlock: false,
        lines: [],
      },
    )
    .lines.join('\n');
