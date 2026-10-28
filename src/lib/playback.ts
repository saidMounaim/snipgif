import { CLIP_LIMITS, type ClipRange } from './clip-range';

export type Speed = 0.5 | 1 | 1.5 | 2 | 3;

export type Playback = { speed: Speed; reverse: boolean; boomerang: boolean };

export const SPEEDS: Speed[] = [0.5, 1, 1.5, 2, 3];

export const DEFAULT_PLAYBACK: Playback = { speed: 1, reverse: false, boomerang: false };

// Whole tenths of a second, like clip-range.ts, so the cap check has no float error.
const TENTHS = 10;

function outputTenths({ startSec, endSec }: ClipRange, { speed, boomerang }: Playback): number {
	const clipTenths = Math.round(endSec * TENTHS) - Math.round(startSec * TENTHS);
	return Math.round((clipTenths / speed) * (boomerang ? 2 : 1));
}

export function outputSec(range: ClipRange, playback: Playback): number {
	return outputTenths(range, playback) / TENTHS;
}

export function tooLong(range: ClipRange, playback: Playback): boolean {
	return outputTenths(range, playback) > CLIP_LIMITS.maxSec * TENTHS;
}

// Goes before fps so the fps filter resamples the sped-up timeline.
export function speedFilter({ speed }: Playback): string {
	return speed === 1 ? '' : `setpts=PTS/${speed},`;
}

// Goes after scaling: reverse buffers every frame of the clip, so keep them small.
export function directionFilter({ reverse, boomerang }: Playback): string {
	const forward = reverse ? 'reverse,' : '';
	if (!boomerang) return forward;
	// The backward pass drops its first and last frames, which repeat the forward pass's
	// last and first, so the loop doesn't pause at either turn. For a clip of one or two
	// frames it ends up empty, and concat outputs the forward pass alone.
	const back = 'trim=start_frame=1,setpts=PTS-STARTPTS,reverse,trim=start_frame=1,setpts=PTS-STARTPTS';
	return `${forward}split[fwd][rev];[rev]${back}[back];[fwd][back]concat=n=2:v=1:a=0,`;
}
