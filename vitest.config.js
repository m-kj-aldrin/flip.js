import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/{src,__tests__}/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});