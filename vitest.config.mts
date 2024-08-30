import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    onConsoleLog: () => true,
    environment: 'happy-dom',
    include: ['**/event_emitter.spec.ts'],
    typecheck: {
      tsconfig: 'tsconfig.spec.json',
      exclude: ['**/index.react_native.spec.ts'],
    },
  },
});
