import { defineConfig } from 'tsup';

export default defineConfig({
  platform: "node",
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ['esm'],
  sourcemap: true,
  clean: true,
  bundle: true,
  minify: false,
  target: "node20",
  dts: false,
  noExternal: [
    '@actions/core',
    '@actions/github',
    '@octokit/rest',
    'gray-matter',
    'ulid'
  ],
});