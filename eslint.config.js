import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['worker-configuration.d.ts'] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Componentes gerados pelo shadcn-svelte — Button.href aceita URLs internas
		// e externas indistintamente, então resolve() (rota estática) não se aplica aqui.
		files: ['src/lib/components/ui/**'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// worker/entry.js referencia svelte-kit-worker.d.ts via triple-slash de
		// propósito — é a única forma de o TS aplicar uma ambient module
		// declaration (fallback de resolução pro import relativo do _worker.js
		// gerado em build time) sem trocar `import` por `require` dinâmico.
		files: ['worker/**'],
		rules: {
			'@typescript-eslint/triple-slash-reference': 'off'
		}
	}
);
