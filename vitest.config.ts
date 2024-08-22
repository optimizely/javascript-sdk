import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    onConsoleLog: () => true,
    environment: 'happy-dom',
    include: ['**/*.spec.ts'],
    typecheck: {
      tsconfig: 'tsconfig.spec.json',
    },
  },
});
