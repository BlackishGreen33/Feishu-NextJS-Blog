export type SSEEvent = {
  data: string;
  event?: string;
};

type SSEEventHandler = (event: SSEEvent) => void;

export const createSSEParser = (onEvent: SSEEventHandler) => {
  let buffer = '';

  const emitEvent = (rawEvent: string) => {
    if (!rawEvent.trim()) {
      return;
    }

    let eventName: string | undefined;
    const dataLines: string[] = [];

    for (const line of rawEvent.split('\n')) {
      if (!line || line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
        continue;
      }

      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (dataLines.length === 0) {
      return;
    }

    onEvent({
      event: eventName,
      data: dataLines.join('\n'),
    });
  };

  return {
    feed(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      let separatorIndex = buffer.indexOf('\n\n');

      while (separatorIndex !== -1) {
        emitEvent(buffer.slice(0, separatorIndex));
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');
      }
    },
    flush() {
      emitEvent(buffer);
      buffer = '';
    },
  };
};
