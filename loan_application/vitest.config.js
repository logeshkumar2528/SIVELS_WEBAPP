import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['Business_Modules/**/src/**/*.test.{js,jsx}', 'Core/src/**/*.test.{js,jsx}'],
    // Written for `node --test`, not Vitest.
    exclude: ['**/node_modules/**', 'Business_Modules/rm_modules/src/pages/KycDocuments/kycDocumentState.test.js'],
    css: false,
  },
});
