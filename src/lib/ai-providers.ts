// Lista curada de providers/modelos pro dropdown de onboarding (ESCOPO.md §2.2).
// IDs de modelo mudam com o tempo — confirmar contra a documentação oficial do
// provider antes de atualizar esta lista.
export const AI_PROVIDERS = {
	deepseek: {
		label: 'DeepSeek',
		models: ['deepseek-v4-pro', 'deepseek-v4-flash'],
		keyUrl: 'https://platform.deepseek.com/api_keys',
		costHint: 'Opção mais barata das três. deepseek-v4-flash é o modelo mais econômico.'
	},
	anthropic: {
		label: 'Anthropic',
		models: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
		keyUrl: 'https://console.anthropic.com/settings/keys',
		costHint: 'claude-haiku-4-5 é o mais barato/rápido; claude-opus-4-8 é o mais caro e capaz.'
	},
	openai: {
		label: 'OpenAI',
		models: ['gpt-5.1', 'gpt-5.1-mini'],
		keyUrl: 'https://platform.openai.com/api-keys',
		costHint: 'gpt-5.1-mini é a opção mais barata; gpt-5.1 é mais caro e capaz.'
	}
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;
