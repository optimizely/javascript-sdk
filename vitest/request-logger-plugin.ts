/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Plugin } from 'vitest/config';
import type { IncomingMessage, ServerResponse } from 'http';

export function requestLoggerPlugin(): Plugin {
  return {
    name: 'request-logger-plugin',
    enforce: 'pre' as const,
    configureServer(server) {
      console.log('[Request/Response Logger] Enabled');

      let requestCounter = 0;
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';
        const method = req.method || '';
        const requestTime = new Date().toISOString();
        const requestId = ++requestCounter;

        // Log incoming request
        console.log('→'.repeat(40));
        console.log(`[INCOMING REQUEST #${requestId}] ${method} ${url}`);
        console.log(`Time: ${requestTime}`);
        console.log('→'.repeat(40));

        const originalWrite = res.write;
        const originalEnd = res.end;
        const chunks: any[] = [];

        // @ts-ignore
        res.write = function(chunk: any, ..._args: any[]) {
          chunks.push(Buffer.from(chunk));
          return true;
        };

        // @ts-ignore
        res.end = function(chunk: any, ...args: any[]) {
          if (chunk) {
            chunks.push(Buffer.from(chunk));
          }

          const buffer = Buffer.concat(chunks);
          const body = buffer.toString('utf8');

          // Log outgoing response
          const contentType = res.getHeader('content-type')?.toString() || 'unknown';
          const statusCode = res.statusCode;
          const contentLength = res.getHeader('content-length') || buffer.length;
          const responseTime = new Date().toISOString();

          console.log('←'.repeat(40));
          console.log(`[OUTGOING RESPONSE #${requestId}] ${method} ${url}`);
          console.log(`Status: ${statusCode}`);
          console.log(`Content-Type: ${contentType}`);
          console.log(`Content-Length: ${contentLength}`);
          console.log(`Time: ${responseTime}`);
          console.log('←'.repeat(40));

          // Restore original methods and send response
          res.write = originalWrite;
          res.end = originalEnd;
          res.end(body, ...args);
        };

        next();
      });
    },
  };
}
