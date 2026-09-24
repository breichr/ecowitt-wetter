<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();
	const d = $derived(data.latest);

	// Statt <meta refresh>: alle 60 s nur die Daten neu laden.
	onMount(() => {
		const id = setInterval(() => invalidate('app:latest'), 60_000);
		return () => clearInterval(id);
	});

	const v = (x: unknown) => (x === null || x === undefined ? '—' : String(x));
</script>

<svelte:head>
	<title>{data.stationName}</title>
</svelte:head>

<div class="content">
	{#if d}
		{#key d.time}
			<pre class="fade-in"><h2>{data.stationName}</h2>Modell      : {v(d.model)}
Aktualisiert: {d.time}{#if data.stale}
					⚠ {data.stale}{/if}{#if d.battery_warnings.length}
					⚠ Batterie schwach: {d.battery_warnings.join(', ')}{/if}

<u><b>Luftdaten</b></u>
Temperatur  : {v(d.temperature)} °C
Taupunkt    : {d.dewpoint !== null ? `${d.dewpoint} °C` : '—'}
Luftfeuchte : {v(d.humidity)} %
Wind        : {v(d.windspeed)} km/h ({d.winddir}){#if d.windgust}, Böe {d.windgust}{/if}
Luftdruck   : {v(d.pressure)} hPa{#if d.pressure_trend?.symbol}&nbsp;<span
						title="{d.pressure_trend.label} ({d.pressure_trend.delta > 0 ? '+' : ''}{d
							.pressure_trend.delta} hPa / 3 h)">{d.pressure_trend.symbol}</span
					>{/if}

<u><b>Niederschlag</b></u>
Regenrate   : {v(d.rainrate)} mm/h
Regen 24h   : {v(d.rainlast24hrs)} mm
Regen Heute : {v(d.raintoday)} mm
Regen Woche : {v(d.rainweek)} mm
Regen Monat : {v(d.rainmonth)} mm
Regen Jahr  : {v(d.rainyear)} mm

<u><b>Temperatur historisch</b></u>
Heute Min.  : {v(d.daymintemp)} °C ({v(d.daymintemptime)})
Heute Max.  : {v(d.daymaxtemp)} °C ({v(d.daymaxtemptime)})
Monat Min.  : {v(d.monthmintemp)} °C ({v(d.monthmintemptime)})
Monat Max.  : {v(d.monthmaxtemp)} °C ({v(d.monthmaxtemptime)})
Jahr Min.   : {v(d.yearmintemp)} °C ({v(d.yearmintemptime)})
Jahr Max.   : {v(d.yearmaxtemp)} °C ({v(d.yearmaxtemptime)})

<a href="/history" class="link">» Verlauf</a>  <a href="/klima" class="link">» Klima</a>
</pre>
		{/key}
	{:else}
		<pre>
Keine Wetterdaten empfangen.
Bitte richte deine Ecowitt-Station so ein,
dass sie Daten an diesen Server sendet:
POST http://&lt;host&gt;/ecowitt
</pre>
	{/if}
</div>

<style>
	.content {
		max-width: 500px;
		word-wrap: break-word;
	}

	pre {
		font-size: 1.1em;
		white-space: pre-wrap;
		line-height: 1.4em;
	}

	pre h2 {
		margin: 0 0 0.4em;
	}

	.link {
		font-size: 0.8em;
		text-decoration: none;
	}

	.fade-in {
		animation: fadeIn 0.6s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 500px) {
		pre {
			font-size: 1.25em;
		}
	}
</style>
