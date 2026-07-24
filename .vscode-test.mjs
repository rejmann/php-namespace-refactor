import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	mocha: {
		require: ['./test-setup/register-path-aliases.js'],
	},
});
