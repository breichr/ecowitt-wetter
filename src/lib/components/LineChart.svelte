<script lang="ts">
	import { completePoints, type HistoryPoint } from '$lib/chart';

	type Props = {
		points: HistoryPoint[];
		/** Optionaler Marker (0..1 Anteil der x-Achse), z. B. 12:00 im 24-h-Bereich */
		marker?: { frac: number; label: string } | null;
		/** Text, wenn weniger als zwei Punkte vorliegen */
		placeholder?: string;
	};
	let { points, marker = null, placeholder = 'keine Daten' }: Props = $props();

	const W = 400;
	const H = 130;
	const padL = 42;
	const padR = 8;
	const padT = 8;
	const padB = 18;

	const valid = $derived(completePoints(points));
	const N = $derived(valid.length);
	const yMin = $derived(Math.min(...valid.map((p) => p.min)));
	const yMax = $derived(Math.max(...valid.map((p) => p.max)));
	const yRange = $derived(yMax - yMin || 1);

	const xScale = (i: number) => padL + (i / (N - 1)) * (W - padL - padR);
	const yScale = (v: number) => padT + (1 - (v - yMin) / yRange) * (H - padT - padB);

	const grid = $derived([yMin, (yMin + yMax) / 2, yMax]);
	const linePath = $derived(
		valid
			.map((p, i) => `${i ? 'L' : 'M'}${xScale(i).toFixed(1)},${yScale(p.avg).toFixed(1)}`)
			.join(' ')
	);
	const rangePath = $derived.by(() => {
		const upper = valid.map(
			(p, i) => `${i ? 'L' : 'M'}${xScale(i).toFixed(1)},${yScale(p.max).toFixed(1)}`
		);
		const lower = valid
			.map((p, i) => `L${xScale(i).toFixed(1)},${yScale(p.min).toFixed(1)}`)
			.reverse();
		return `${upper.join(' ')} ${lower.join(' ')} Z`;
	});
	const shortT = (s: string) => (s.length >= 16 ? s.slice(5, 16) : s);
	const markerX = $derived(marker ? padL + marker.frac * (W - padL - padR) : null);

	// --- Hover: pro Frame max. ein Update (rAF), Linie nur bei echter x-Bewegung ---
	let svgEl: SVGSVGElement | undefined = $state();
	let hoverX: number | null = $state(null);
	let tooltip: { x: number; y: number; text: string } | null = $state(null);
	let cx = 0;
	let cy = 0;
	let rafPending = false;

	function update() {
		rafPending = false;
		if (!svgEl || N < 2) return;
		const rect = svgEl.getBoundingClientRect();
		if (!rect.width) return;
		const xUser = Math.max(padL, Math.min(W - padR, ((cx - rect.left) / rect.width) * W));
		const x = Number(xUser.toFixed(1));
		if (x !== hoverX) hoverX = x;
		const idx = Math.max(
			0,
			Math.min(N - 1, Math.round(((xUser - padL) / (W - padL - padR)) * (N - 1)))
		);
		const t = valid[idx]!.t;
		tooltip = { x: cx, y: cy, text: t.length >= 16 ? t.slice(11, 16) : t };
	}

	function onmove(e: MouseEvent) {
		cx = e.clientX;
		cy = e.clientY;
		if (!rafPending) {
			rafPending = true;
			requestAnimationFrame(update);
		}
	}

	function onleave() {
		hoverX = null;
		tooltip = null;
	}
</script>

<svg
	bind:this={svgEl}
	class="line-chart"
	viewBox="0 0 {W} {H}"
	preserveAspectRatio="none"
	role="img"
	onmousemove={onmove}
	onmouseleave={onleave}
>
	{#if N < 2}
		<text class="axis" x={W / 2} y={H / 2} text-anchor="middle">{placeholder}</text>
	{:else}
		{#each grid as g, i (i)}
			<line class="grid" x1={padL} y1={yScale(g)} x2={W - padR} y2={yScale(g)} />
			<text class="axis" x={padL - 4} y={yScale(g) + 3} text-anchor="end">{g.toFixed(1)}</text>
		{/each}
		<path class="range-area" d={rangePath} />
		<path class="line" d={linePath} />
		{#if hoverX !== null}
			<line class="hover-line" x1={hoverX} y1={padT} x2={hoverX} y2={H - padB} />
		{/if}
		{#if marker && markerX !== null && marker.frac >= 0 && marker.frac <= 1}
			<line class="marker" x1={markerX} y1={padT} x2={markerX} y2={H - padB} />
			<text class="axis" x={markerX} y={padT + 8} text-anchor="middle">{marker.label}</text>
		{/if}
		<text class="axis" x={padL} y={H - 4}>{shortT(valid[0]!.t)}</text>
		<text class="axis" x={W - padR} y={H - 4} text-anchor="end">{shortT(valid[N - 1]!.t)}</text>
	{/if}
</svg>

{#if tooltip}
	<div class="tooltip" style="left: {tooltip.x + 10}px; top: {tooltip.y - 10}px">
		{tooltip.text}
	</div>
{/if}

<style>
	.line-chart {
		width: 100%;
		height: 130px;
		background: var(--panel);
		border-radius: 3px;
		display: block;
	}
	.grid {
		stroke: var(--grid);
		stroke-width: 0.5;
	}
	.range-area {
		fill: #49362833;
	}
	.line {
		fill: none;
		stroke: var(--fg);
		stroke-width: 1.4;
		vector-effect: non-scaling-stroke;
	}
	.marker {
		stroke: var(--fg);
		stroke-width: 0.8;
		stroke-dasharray: 3 2;
		opacity: 0.55;
	}
	.hover-line {
		stroke: var(--fg);
		stroke-width: 0.8;
		stroke-dasharray: 2 2;
	}
	.axis {
		font-size: 10px;
		fill: var(--fg);
		opacity: 0.7;
		font-family: monospace;
	}
	.tooltip {
		position: fixed;
		background: rgba(73, 54, 40, 0.95);
		color: var(--bg);
		padding: 4px 8px;
		border-radius: 3px;
		font-size: 11px;
		pointer-events: none;
		z-index: 100;
		white-space: nowrap;
	}
</style>
