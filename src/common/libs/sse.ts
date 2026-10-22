import { createParser } from 'eventsource-parser';

export type SSEEvent = { data: string; event?: string };

export const createSSEParser = (onEvent: (event: SSEEvent) => void) => {
  const parser = createParser({
    onEvent: (event) =>
      onEvent({
        data: event.data,
        ...(event.event === undefined ? {} : { event: event.event }),
      }),
  });
  return {
    feed: parser.feed,
    // Preserve our EOF contract: dispatch a final unterminated event.
    // Consuming an incomplete line during reset does not guarantee dispatch.
    flush: () => parser.feed('\n\n'),
  };
};
