export type ClipRange = { startSec: number; endSec: number };

export const CLIP_LIMITS = { maxSec: 30, minSec: 0.1, stepSec: 0.1 } as const;

// Work in whole tenths of a second so 0.1 steps never accumulate float error.
const TENTHS = 10;
const MAX = CLIP_LIMITS.maxSec * TENTHS;
const MIN = CLIP_LIMITS.minSec * TENTHS;

const toTenths = (sec: number) => Math.round(sec * TENTHS);
const toSec = (tenths: number) => tenths / TENTHS;
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
// Floor so the end handle never points past the last frame.
const durationTenths = (durationSec: number) => Math.floor(durationSec * TENTHS + 1e-6);

function tooShort(durationSec: number): ClipRange | null {
	return durationTenths(durationSec) < MIN ? { startSec: 0, endSec: durationSec } : null;
}

export function defaultRange(durationSec: number): ClipRange {
	return (
		tooShort(durationSec) ?? {
			startSec: 0,
			endSec: toSec(Math.min(durationTenths(durationSec), MAX)),
		}
	);
}

export function moveStart(range: ClipRange, startSec: number, durationSec: number): ClipRange {
	const short = tooShort(durationSec);
	if (short) return short;
	const total = durationTenths(durationSec);
	const start = clamp(toTenths(startSec), 0, total - MIN);
	const end = clamp(toTenths(range.endSec), start + MIN, Math.min(start + MAX, total));
	return { startSec: toSec(start), endSec: toSec(end) };
}

export function moveEnd(range: ClipRange, endSec: number, durationSec: number): ClipRange {
	const short = tooShort(durationSec);
	if (short) return short;
	const total = durationTenths(durationSec);
	const end = clamp(toTenths(endSec), MIN, total);
	const start = clamp(toTenths(range.startSec), Math.max(end - MAX, 0), end - MIN);
	return { startSec: toSec(start), endSec: toSec(end) };
}

// The end handle sits on the exclusive edge of the clip, where there is often no frame;
// preview the last frame inside the selection instead.
export function lastFrameSec(range: ClipRange): number {
	return toSec(Math.max(toTenths(range.startSec), toTenths(range.endSec) - 1));
}

export function formatTime(sec: number): string {
	const tenths = Math.max(0, Math.round(sec * TENTHS));
	const minutes = Math.floor(tenths / 600);
	const seconds = Math.floor((tenths % 600) / TENTHS);
	return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % TENTHS}`;
}
