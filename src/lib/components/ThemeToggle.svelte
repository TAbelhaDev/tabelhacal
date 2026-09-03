<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '@tabelhadev/tabelhawebui';
</script>

<Button onclick={toggleMode} variant="ghost" size="icon-sm" aria-label="Alternar tema claro/escuro">
	<SunIcon class="dark:hidden" />
	<MoonIcon class="hidden dark:block" />
</Button>
