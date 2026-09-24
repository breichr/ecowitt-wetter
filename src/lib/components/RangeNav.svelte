<script lang="ts">
	type Props = {
		items: { key: string; label: string }[];
		active: string | number | null;
		param: string;
	};
	let { items, active, param }: Props = $props();
</script>

<nav class="nav">
	{#each items as item (item.key)}
		<a
			href="?{param}={item.key}"
			class:active={String(active) === item.key}
			aria-current={String(active) === item.key ? 'page' : undefined}>{item.label}</a
		>
	{/each}
</nav>
