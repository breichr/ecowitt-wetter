<script lang="ts">
	import RangeNav from '$lib/components/RangeNav.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Status — {data.stationName}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="content">
	<h2>Status <a href="/" class="back">← zurück</a></h2>

	<div class="notice" class:ok={data.online}>
		{#if data.online}
			🟢 Online{#if data.age !== null}&nbsp;· letzter Wert vor {data.age} s{/if}
		{:else}
			🔴 Offline{#if data.age !== null}&nbsp;· seit {Math.floor(data.age / 60)} min{:else}&nbsp;·
				noch keine Daten empfangen{/if}
		{/if}
	</div>

	<RangeNav items={data.ranges} active={data.period} param="range" />

	<div class="summary">
		Zeitraum {data.periodLabel}: {data.gaps.length}
		{data.gaps.length === 1 ? 'Ausfall' : 'Ausfälle'}{#if data.totalDowntime}&nbsp;· insgesamt {data.totalDowntime}
			offline{/if}
	</div>

	{#if data.gaps.length}
		<table class="data">
			<thead>
				<tr><th>Von</th><th class="left">Bis</th><th>Dauer</th></tr>
			</thead>
			<tbody>
				{#each data.gaps as g (g.start_fmt + g.end_fmt)}
					<tr>
						<td>{g.start_fmt}</td>
						<td class="left">{g.end_fmt}</td>
						<td>{g.duration_fmt}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<div class="empty">Keine Ausfälle im gewählten Zeitraum.</div>
	{/if}
</div>

<style>
	.summary {
		font-size: 0.85em;
		opacity: 0.75;
		margin-bottom: 0.8em;
	}
	.left {
		text-align: left;
	}
</style>
