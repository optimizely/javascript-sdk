/**
 * Copyright 2024-2025, Optimizely
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

export function consoleCapturePlugin(): Plugin {
  return {
    name: 'console-capture-plugin',
    enforce: 'pre' as const,
    configureServer(server) {
      console.log('[Console Capture] Enabled');

      // Add middleware to handle console log posts from browser
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === '/__vitest_console__' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const timestamp = new Date(data.timestamp).toISOString();
              console.log(`\n[BROWSER ${data.type.toUpperCase()}] ${timestamp}`);
              console.log(data.message);
            } catch (error) {
              console.error('[Console Capture] Failed to parse browser log:', error);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
          return;
        }
        next();
      });

      // Add middleware to inject console-capture script into HTML responses
      server.middlewares.use((_req: IncomingMessage, res: ServerResponse, next: () => void) => {
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
          let body = buffer.toString('utf8');

          // Inject console-capture script into HTML responses
          if (res.getHeader('content-type')?.toString().includes('text/html')) {
            const scriptTag = '<script src="/console-capture.js"></script>';
            if (body.includes('</head>') && !body.includes('console-capture.js')) {
              body = body.replace('</head>', `${scriptTag}\n</head>`);
              res.setHeader('content-length', Buffer.byteLength(body));
            }
          }

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
