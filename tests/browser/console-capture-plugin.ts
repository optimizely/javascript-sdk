/**
 * Copyright 2025-2026, Optimizely
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
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// Enabled with VITEST_CONSOLE_CAPTURE=true. Loads public/console-capture.js in the
// test page, which posts the browser's console output to /__vitest_console__;
// this plugin prints it in the terminal.
export function consoleCapturePlugin(): Plugin {
  return {
    name: 'console-capture-plugin',
    enforce: 'pre',
    configureServer(server) {
      console.log('[Console Capture] Enabled');

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
    },
    // Vitest runs the test page through Vite's transformIndexHtml
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { src: '/console-capture.js' },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
