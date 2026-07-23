<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { toast } from 'svelte-sonner';

	const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW();

	$effect(() => {
		if ($offlineReady) toast.success('Gosplan está pronto para uso offline.');
	});

	$effect(() => {
		if ($needRefresh) {
			toast('Nova versão do Gosplan disponível.', {
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: 'Atualizar',
					onClick: () => updateServiceWorker(true)
				}
			});
		}
	});
</script>
