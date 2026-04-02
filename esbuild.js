const esbuild = require('esbuild'); // eslint-disable-line

const production = process.argv.includes('--production'); // eslint-disable-line
const watch = process.argv.includes('--watch'); // eslint-disable-line

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started'); // eslint-disable-line
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`); // eslint-disable-line
        console.error(`    ${location.file}:${location.line}:${location.column}:`); // eslint-disable-line
      });
      console.log('[watch] build finished'); // eslint-disable-line
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [
      'src/extension.ts'
    ],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e); // eslint-disable-line
  process.exit(1); // eslint-disable-line
});
