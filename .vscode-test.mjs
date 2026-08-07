import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/**/*.test.js',
	mocha: {
		require: ['./test-setup/register-path-aliases.js'],
	},
});
