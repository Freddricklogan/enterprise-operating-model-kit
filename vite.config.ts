import { defineConfig } from 'vite';

// The Pages URL is https://freddricklogan.github.io/enterprise-operating-model-kit/ — the base must match.
export default defineConfig({
  base: '/enterprise-operating-model-kit/',
  build: {
    target: 'es2022',
    sourcemap: false,
    // One entry chunk; no vendor split needed at this size. modulePreload is bundled, not inline.
    modulePreload: { polyfill: true }
  }
});
