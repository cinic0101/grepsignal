import { defineConfig } from 'astro/config';

const base = process.env.PUBLIC_BASE_PATH ?? '/';
const site = process.env.PUBLIC_SITE_URL ?? 'https://cinic0101.github.io';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
});
