import type { StreamHandlers } from '../types';

/**
 * Reads a Server-Sent Events stream from a fetch() Response body.
 * (EventSource only supports GET, so for POST we parse the stream ourselves.)
 */
export async function readSSE(response: Response, handlers: StreamHandlers): Promise<void> {
  if (!response.body) throw new Error('Streaming is not supported by this browser');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line.
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      dispatch(raw, handlers);
    }
  }
}

export function dispatch(raw: string, h: StreamHandlers): void {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  const data = JSON.parse(dataLines.join('\n'));
  switch (event) {
    case 'start':
      h.onStart?.(data);
      break;
    case 'token':
      h.onToken?.(data.text);
      break;
    case 'done':
      h.onDone?.(data);
      break;
    case 'title':
      h.onTitle?.(data.title);
      break;
    case 'error':
      h.onError?.(data);
      break;
  }
}
