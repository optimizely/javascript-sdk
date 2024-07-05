/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { join } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // plugins: [tsconfigPaths()],
  test: {
    browser: {
      enabled: true,
      name: 'chrome',
      headless: true,
    },
    include: ['lib/web.test.ts'],
    globals: true,
    alias: {
      'errorMessage': join(__dirname, './lib/errorMessage.gen'),
    }
  },
});
