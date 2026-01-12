#!/usr/bin/env node

/**
 * Simple HTTP server to serve the datafile for testing polling project config manager
 * Runs at http://localhost:8910
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
