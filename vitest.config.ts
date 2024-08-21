// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    include: ['**/httpPollingDatafileManager.spec.ts'],
    coverage: {
      provider: 'istanbul',
    },
    typecheck: {
      enabled: true,
      include: ['**/httpPollingDatafileManager.spec.ts'],
      tsconfig: './tsconfig.spec.vitest.json',
    }
  },
});
