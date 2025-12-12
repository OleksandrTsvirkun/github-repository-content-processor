import { defineConfig, Options } from 'tsup';

const defaultConfig: Options = {
  platform: "node",
  entry: ["src/index.ts"],
  target: "node20",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: [
    '@actions/core',
    '@actions/github',
    '@octokit/rest',
    'gray-matter',
    'ulid'
  ],
}

export default defineConfig([{
  ...defaultConfig,
  format: ['esm'],
  dts: true,
  outExtension: () => ({ js: '.mjs' })
},
{
  ...defaultConfig,
  format: ['cjs'],
  outExtension: () => ({ js: '.cjs' })
}]);
