import { createSSEParser } from '@/common/libs/sse';

it('parses multiline data, split CRLF, comments and EOF at every chunk boundary', () => {
  const input =
    ': comment\r\nevent: delta\r\ndata: first\r\ndata: second\r\n\r\ndata: eof';
  for (let split = 0; split <= input.length; split++) {
    const events: Array<{ data: string; event?: string }> = [];
    const parser = createSSEParser((event) => events.push(event));
    parser.feed(input.slice(0, split));
    parser.feed(input.slice(split));
    parser.flush();
    parser.flush();
    expect(events).toEqual([
      { event: 'delta', data: 'first\nsecond' },
      { data: 'eof' },
    ]);
  }
});
