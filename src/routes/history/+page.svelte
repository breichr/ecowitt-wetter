<script lang="ts">
	import { summarize, type HistoryPoint } from '$lib/chart';
	import { toDbTimestamp } from '$lib/format';
	import LineChart from '$lib/components/LineChart.svelte';
	import RangeNav from '$lib/components/RangeNav.svelte';
	import { HISTORY_METRICS, HISTORY_RANGES } from '$lib/ranges';

	let { data } = $props();

	type State =
		{ status: 'loading' } | { status: 'error' } | { status: 'ok'; points: HistoryPoint[] };
	let charts: Record<string, State> = $state({});
	let marker: { frac: number; label: string } | null = $state(null);

	const navItems = Object.entries(HISTORY_RANGES).map(([key, r]) => ({ key, label: r.label }));

	$effect(() => {
		const cfg = HISTORY_RANGES[data.period];
		const now = new Date();
		const from = new Date(now.getTime() - cfg.ms);

		// 12:00-Markierung nur im 24-h-Bereich
		marker = null;
		if (data.period === '24h') {
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
			const noon =
				today > now ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12) : today;
			const frac = (noon.getTime() - from.getTime()) / (now.getTime() - from.getTime());
			if (frac >= 0 && frac <= 1) marker = { frac, label: '12:00' };
		}

		const controller = new AbortController();
		charts = Object.fromEntries(HISTORY_METRICS.map((m) => [m.key, { status: 'loading' }]));
		const qs = (metric: string) =>
			new URLSearchParams({
				metric,
				bucket: cfg.bucket,
				from: toDbTimestamp(from),
				to: toDbTimestamp(now)
			});
		for (const m of HISTORY_METRICS) {
			fetch(`/api/history?${qs(m.key)}`, { signal: controller.signal })
				.then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
				.then((body: { points: HistoryPoint[] }) => {
					charts[m.key] = { status: 'ok', points: body.points ?? [] };
				})
				.catch((e: unknown) => {
					if ((e as Error).name !== 'AbortError') charts[m.key] = { status: 'error' };
				});
		}
		return () => controller.abort();
	});
</script>

<svelte:head>
	<title>Verlauf — {data.stationName}</title>
</svelte:head>

<div class="content">
	<h2>Verlauf <a href="/" class="back">← zurück</a></h2>
	<RangeNav items={navItems} active={data.period} param="range" />

	{#each HISTORY_METRICS as m (m.key)}
		{@const c = charts[m.key]}
		<section class="chart">
			<div class="chart-head">
				<span class="chart-title">{m.label} ({m.unit})</span>
				<span class="chart-meta">
					{#if !c || c.status === 'loading'}lädt…{:else if c.status === 'error'}Fehler{:else}{summarize(
							c.points
						)}{/if}
				</span>
			</div>
			<LineChart
				points={c?.status === 'ok' ? c.points : []}
				{marker}
				placeholder={!c || c.status === 'loading'
					? ''
					: c.status === 'error'
						? 'Fehler'
						: 'keine Daten'}
			/>
		</section>
	{/each}
</div>

<style>
	.chart {
		margin-bottom: 1.3em;
	}
	.chart-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0 2px 2px;
		gap: 0.5em;
	}
	.chart-title {
		font-weight: bold;
	}
	.chart-meta {
		font-size: 0.82em;
		opacity: 0.75;
		white-space: pre;
	}
</style>
