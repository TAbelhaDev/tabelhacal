// Lista curada de providers/modelos pro dropdown de onboarding (ESCOPO.md §2.2).
// IDs de modelo mudam com o tempo — confirmar contra a documentação oficial do
// provider antes de atualizar esta lista (mesmo espírito de STACK.md).
export const AI_PROVIDERS = {
	anthropic: {
		label: 'Anthropic',
		models: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001']
	},
	openai: {
		label: 'OpenAI',
		models: ['gpt-5.1', 'gpt-5.1-mini']
	}
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;
