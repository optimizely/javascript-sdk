import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    onConsoleLog: () => true,
    environment: 'happy-dom',
    include: ["**/config_manager_factory.spec.ts"],
    typecheck: {
      tsconfig: 'tsconfig.spec.json',
      exclude: ['**/index.react_native.spec.ts'],
    },
  },
});
