<script lang="ts">
	import ClimateChart from '$lib/components/ClimateChart.svelte';
	import RangeNav from '$lib/components/RangeNav.svelte';
	import { MONTHS_LONG, MONTHS_SHORT } from '$lib/ranges';

	let { data } = $props();

	const fmt = (v: number | null | undefined, digits = 1) =>
		v === null || v === undefined ? '–' : v.toFixed(digits);

	const warning = $derived.by(() => {
		const c = data.climate;
		if (!c) return null;
		const name = (m: number) => MONTHS_SHORT[m - 1];
		const byStatus = (s: string) => c.months.filter((m) => m.status === s);
		const parts: string[] = [];
		const missing = byStatus('missing').map((m) => name(m.month));
		const incomplete = byStatus('incomplete').map(
			(m) => `${name(m.month)} (${m.days_with_data}/${m.days_in_month} Tage)`
		);
		const partial = byStatus('partial').map(
			(m) => `${name(m.month)} (${m.days_with_data}/${m.days_in_month} Tage)`
		);
		const future = byStatus('future').length;
		if (missing.length) parts.push(`Keine Daten: ${missing.join(', ')}`);
		if (incomplete.length) parts.push(`Unvollständig: ${incomplete.join(', ')}`);
		if (partial.length) parts.push(`Laufend: ${partial.join(', ')}`);
		if (future) parts.push(`${future} Monat${future === 1 ? '' : 'e'} noch ausstehend`);
		return parts.length ? `⚠ ${parts.join(' · ')}` : null;
	});
</script>

<svelte:head>
	<title>Klimadiagramm — {data.stationName}</title>
</svelte:head>

<div class="content">
	<h2>
		Klimadiagramm{data.year ? ` ${data.year}` : ''}
		<a href="/" class="back">← zurück</a>
	</h2>

	{#if !data.climate}
		<div class="empty">Noch keine Daten in der Datenbank.</div>
	{:else}
		<RangeNav
			items={data.years.map((y) => ({ key: String(y), label: String(y) }))}
			active={data.year}
			param="year"
		/>

		{#if warning}
			<div class="notice">{warning}</div>
		{/if}

		<ClimateChart
			climate={data.climate}
			stationName={data.stationName}
			stationElevation={data.stationElevation}
		/>

		<table class="data">
			<thead>
				<tr>
					<th>Monat</th>
					<th>Ø T (°C)</th>
					<th>Min (°C)</th>
					<th>Max (°C)</th>
					<th>Σ N (mm)</th>
				</tr>
			</thead>
			<tbody>
				{#each data.climate.months as m (m.month)}
					{@const hasData = m.temp_avg !== null || m.precipitation !== null}
					<tr
						class:no-data={!hasData}
						class:incomplete={hasData && (m.status === 'partial' || m.status === 'incomplete')}
					>
						<td>{MONTHS_LONG[m.month - 1]}</td>
						<td>{fmt(m.temp_avg)}</td>
						<td>{fmt(m.temp_min)}</td>
						<td>{fmt(m.temp_max)}</td>
						<td>{fmt(m.precipitation)}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td>Jahr</td>
					<td>{fmt(data.climate.annual_temp_avg)}</td>
					<td>{fmt(data.climate.annual_temp_min)}</td>
					<td>{fmt(data.climate.annual_temp_max)}</td>
					<td>{fmt(data.climate.annual_precipitation, 0)}</td>
				</tr>
			</tfoot>
		</table>
	{/if}
</div>

<style>
	.content {
		max-width: 720px;
	}
	table {
		margin-top: 1em;
	}
	tr.incomplete td {
		opacity: 0.55;
		font-style: italic;
	}
	tr.no-data td {
		opacity: 0.35;
	}
	tfoot td {
		font-weight: bold;
		border-top: 1px solid var(--fg);
		border-bottom: none;
		padding-top: 0.5em;
	}
</style>
