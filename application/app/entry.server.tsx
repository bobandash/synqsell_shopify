import * as Sentry from '@sentry/remix';
import { PassThrough } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';
import { RemixServer } from '@remix-run/react';
import { createReadableStreamFromReadable } from '@remix-run/node';
import type { EntryContext } from '@remix-run/node';
import { isbot } from 'isbot';
import { addDocumentResponseHeaders, authenticate } from './shopify.server';
import { getRouteError, logError } from './lib/utils/server';

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get('user-agent');
  const callbackName = isbot(userAgent ?? '') ? 'onAllReady' : 'onShellReady';

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={ABORT_DELAY}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

export const handleError = Sentry.wrapHandleErrorWithSentry(
  async (error: unknown, { request }: { request: any }) => {
    if (!request.signal.aborted) {
      await sendErrorToErrorReportingService(error, request);
      // errors typically bubble up to entry.server.tsx on unhandled errors / loaders
      throw getRouteError(error);
    }
  },
);

// sends error to cloudwatch and sentry
async function sendErrorToErrorReportingService(error: unknown, request: any) {
  const {
    session: { id: sessionId },
  } = await authenticate.admin(request);
  logError(error, { sessionId });
}
