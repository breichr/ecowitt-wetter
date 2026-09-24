export type HistoryPoint = {
	t: string;
	avg: number | null;
	min: number | null;
	max: number | null;
};

export type XY = { x: number; y: number };

/** Nur Punkte mit vollständigen Werten (Buckets ohne Messwerte fallen raus). */
export function completePoints(points: HistoryPoint[]) {
	return points.filter(
		(p): p is { t: string; avg: number; min: number; max: number } =>
			p.avg !== null && p.min !== null && p.max !== null
	);
}

/** Kurztext "Ø … · Min … · Max …" über der Kurve. */
export function summarize(points: HistoryPoint[]): string {
	const v = completePoints(points);
	if (v.length < 2) return 'keine Daten';
	const avg = v.reduce((a, p) => a + p.avg, 0) / v.length;
	const lo = Math.min(...v.map((p) => p.min));
	const hi = Math.max(...v.map((p) => p.max));
	return `Ø ${avg.toFixed(1)}  ·  Min ${lo.toFixed(1)}  ·  Max ${hi.toFixed(1)}`;
}

/** Catmull-Rom → kubische Bézier (glatte Kurve durch alle Punkte). */
export function smoothPath(pts: XY[]): string {
	if (pts.length < 2) return '';
	const f = (n: number) => n.toFixed(1);
	if (pts.length === 2) return `M${f(pts[0]!.x)},${f(pts[0]!.y)} L${f(pts[1]!.x)},${f(pts[1]!.y)}`;
	let d = `M${f(pts[0]!.x)},${f(pts[0]!.y)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2.x)},${f(p2.y)}`;
	}
	return d;
}

/** Zusammenhängende Abschnitte ohne Lücken (null) bilden. */
export function splitSegments<T>(arr: (T | null)[]): T[][] {
	const out: T[][] = [];
	let cur: T[] = [];
	for (const p of arr) {
		if (p) cur.push(p);
		else if (cur.length) {
			out.push(cur);
			cur = [];
		}
	}
	if (cur.length) out.push(cur);
	return out;
}
