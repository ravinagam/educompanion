import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // pdfjs-dist legacy build is Node.js-only and can't be bundled by Vite.
      // Redirect to a no-op stub so vite:import-analysis never tries to resolve it.
      'pdfjs-dist/legacy/build/pdf.js': path.resolve(__dirname, '__tests__/stubs/pdfjs-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/api/**'],
      exclude: ['**/*.d.ts', '**/*.config.*'],
    },
  },
});
