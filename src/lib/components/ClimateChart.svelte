<script lang="ts">
	import { smoothPath, splitSegments, type XY } from '$lib/chart';
	import { MONTHS_SHORT } from '$lib/ranges';
	import type { Climate } from '$lib/types';

	type Props = { climate: Climate; stationName: string; stationElevation: number };
	let { climate, stationName, stationElevation }: Props = $props();

	// Klimadiagramm nach Walter/Lieth: 10 °C ≙ 20 mm, oberhalb 100 mm komprimiert (1:10).
	const W = 640;
	const H = 440;
	const padL = 58;
	const padR = 58;
	const padT = 44;
	const padB = 36;
	const innerW = W - padL - padR;
	const innerH = H - padT - padB;

	const tMinAxis = -50;
	const tMaxAxis = 50;
	const pLinearMax = 100;
	const pCompMax = 900;
	const totalUnits = Math.abs(tMinAxis) + tMaxAxis + (pCompMax - pLinearMax) / 20;
	const pxPerC = innerH / totalUnits;
	const yRef = padT + (tMaxAxis + (pCompMax - pLinearMax) / 20) * pxPerC; // 0 °C = 0 mm

	const yTemp = (t: number) => yRef - t * pxPerC;
	const yPrec = (p: number) =>
		p <= pLinearMax
			? yRef - (p * pxPerC) / 2
			: yRef - (pLinearMax * pxPerC) / 2 - ((p - pLinearMax) / 10) * (pxPerC / 2);
	const xCenter = (i: number) => padL + (innerW * i) / 11;

	const tempTicks = Array.from({ length: 11 }, (_, i) => tMinAxis + i * 10);
	const precTicksLinear = [0, 20, 40, 60, 80];
	const precTicksComp = [100, 300, 500, 700, 900];

	const tempPts = $derived(
		climate.months.map((m, i): XY | null =>
			m.temp_avg !== null ? { x: xCenter(i), y: yTemp(m.temp_avg) } : null
		)
	);
	const precPts = $derived(
		climate.months.map((m, i): XY | null =>
			m.precipitation !== null ? { x: xCenter(i), y: yPrec(m.precipitation) } : null
		)
	);
	const precAreas = $derived(
		splitSegments(precPts)
			.filter((s) => s.length >= 2)
			.map(
				(s) =>
					`${smoothPath(s)} L${s[s.length - 1]!.x.toFixed(1)},${yRef.toFixed(1)} L${s[0]!.x.toFixed(1)},${yRef.toFixed(1)} Z`
			)
	);
	const tempLines = $derived(
		splitSegments(tempPts)
			.filter((s) => s.length >= 2)
			.map(smoothPath)
	);
	const midY = padT + innerH / 2;
</script>

<svg class="climate" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img">
	<!-- Kopfzeile -->
	<text class="head-big" x={padL} y="18">{stationName}</text>
	{#if stationElevation}
		<text class="head" x={padL} y="34">{stationElevation} m ü. NN</text>
	{/if}
	<text class="head-big" x={W - padR} y="18" text-anchor="end">
		{climate.annual_temp_avg !== null ? `${climate.annual_temp_avg.toFixed(1)} °C` : '–'}
	</text>
	<text class="head-big" x={W - padR} y="34" text-anchor="end">
		{climate.annual_precipitation.toFixed(0)} mm
	</text>
	{#if climate.annual_temp_max !== null && climate.annual_temp_min !== null}
		<text class="head" x={W / 2} y="18" text-anchor="middle">{climate.year}</text>
		<text class="head" x={W / 2} y="34" text-anchor="middle">
			Max {climate.annual_temp_max.toFixed(1)}° · Min {climate.annual_temp_min.toFixed(1)}°
		</text>
	{/if}

	<rect class="frame" x={padL} y={padT} width={innerW} height={innerH} />

	{#each tempTicks as t (t)}
		<line class="grid" x1={padL} y1={yTemp(t)} x2={W - padR} y2={yTemp(t)} />
		<text class="tick" x={padL - 5} y={yTemp(t) + 3} text-anchor="end">{t}</text>
	{/each}
	{#each precTicksLinear as p (p)}
		<text class="tick" x={W - padR + 5} y={yPrec(p) + 3}>{p}</text>
	{/each}
	{#each precTicksComp as p (p)}
		<line class="grid" x1={padL} y1={yPrec(p)} x2={W - padR} y2={yPrec(p)} opacity="0.35" />
		<text class="tick" x={W - padR + 5} y={yPrec(p) + 3}>{p}</text>
	{/each}

	<text
		class="axis-label"
		x={padL - 44}
		y={midY}
		text-anchor="middle"
		transform="rotate(-90 {padL - 44} {midY})">Temperatur [°C]</text
	>
	<text
		class="axis-label"
		x={W - padR + 44}
		y={midY}
		text-anchor="middle"
		transform="rotate(90 {W - padR + 44} {midY})">Niederschlag [mm]</text
	>

	<line class="zero-line" x1={padL} y1={yRef} x2={W - padR} y2={yRef} />

	{#each MONTHS_SHORT as name, i (name)}
		<text class="month" x={xCenter(i)} y={padT + innerH + 16} text-anchor="middle">{name}</text>
	{/each}

	{#each precAreas as d, i (i)}
		<path class="precip-fill" {d} />
	{/each}
	{#each tempLines as d, i (i)}
		<path class="temp-line" {d} />
	{/each}
	{#each tempPts as pt, i (i)}
		{#if pt}
			<circle class="temp-point" cx={pt.x} cy={pt.y} r="2" />
		{/if}
	{/each}
</svg>

<div class="legend">
	<span class="temp">Temperatur (°C)</span>
	<span class="precip">Niederschlag (mm)</span>
</div>

<style>
	.climate {
		width: 100%;
		height: auto;
		display: block;
	}
	.climate text {
		font-family: monospace;
		fill: var(--fg);
	}
	.frame {
		fill: none;
		stroke: var(--fg);
		stroke-width: 1;
	}
	.grid {
		stroke: var(--fg);
		stroke-width: 0.4;
		opacity: 0.22;
	}
	.tick {
		font-size: 10px;
	}
	.axis-label {
		font-size: 11px;
		font-weight: bold;
	}
	.head-big {
		font-size: 13px;
		font-weight: bold;
	}
	.head,
	.month {
		font-size: 11px;
	}
	.temp-line {
		fill: none;
		stroke: #c43e1c;
		stroke-width: 2.2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.temp-point {
		fill: #c43e1c;
	}
	.precip-fill {
		fill: #3a7cba;
		opacity: 0.55;
	}
	.zero-line {
		stroke: var(--fg);
		stroke-width: 0.8;
		opacity: 0.5;
	}
	.legend {
		display: flex;
		gap: 1.3em;
		flex-wrap: wrap;
		font-size: 0.82em;
		padding-top: 0.7em;
		justify-content: center;
		opacity: 0.85;
	}
	.legend span::before {
		content: '';
		display: inline-block;
		width: 0.9em;
		height: 0.9em;
		margin-right: 0.3em;
		vertical-align: middle;
	}
	.legend .temp::before {
		background: #e63946;
		border-radius: 1px;
	}
	.legend .precip::before {
		background: #7fa6d0;
	}
</style>
