#!/usr/bin/env node

/**
 * Copyright 2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Simple HTTP server to serve the datafile for testing polling project config manager
 * Runs at http://localhost:PORT
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8910;
const datafilePath = path.join(__dirname, 'datafile.json');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Read and serve the datafile
  fs.readFile(datafilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading datafile:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read datafile' }));
      return;
    }

    // Set CORS headers for cross-origin requests
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n=== Datafile Server Started ===`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving datafile from: ${datafilePath}`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n\nShutting down datafile server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
