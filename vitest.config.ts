// vitest.config.ts
import { coverageConfigDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    onConsoleLog: () => true,
    environment: 'happy-dom',
    include: ['**/*.spec.ts'],
    typecheck: {
      tsconfig: 'tsconfig.spec.json',
    },
    coverage: {
      enabled: true,
      provider: 'istanbul',
      exclude: ['**/*.spec.ts', '**/*.d.ts', ...coverageConfigDefaults.exclude],
    }
  },
});
