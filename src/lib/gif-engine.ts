import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ClipRange } from './clip-range';
import { cropFilter, type Crop } from './crop';
import { QUALITY_COLORS, type OutputSettings } from './output-settings';
import { directionFilter, outputSec, speedFilter, type Playback } from './playback';
import type { SourceVideo } from './video-file';

// Still-frame previews stay small whatever output width is chosen.
const FRAME_PREVIEW_WIDTH = 480;

// Single-threaded core: the multi-threaded one needs COOP/COEP headers, which break AdSense.
const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

export type GifResult = {
	blob: Blob;
	objectUrl: string;
	sizeBytes: number;
};

export class EngineLoadError extends Error {}
export class ConversionError extends Error {}
export class MemoryError extends ConversionError {}
export class UnsupportedVideoError extends ConversionError {}

// The worker rejects with the wasm error as a string, e.g. "RuntimeError: Aborted(OOM)".
const MEMORY_FAILURE =
	/OOM|out of memory|Cannot enlarge memory|memory access out of bounds|Array buffer allocation failed/i;
const UNSUPPORTED_CONTENTS =
	/Invalid data found when processing input|Decoder \(codec [^)]*\) not found|does not contain any stream/;

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let input: { video: SourceVideo; name: string; ready: Promise<void> } | null = null;
// Outlives an engine reset so the next call can write the same video into a fresh engine.
let selected: SourceVideo | null = null;

function asMemoryError(reason: unknown): MemoryError | null {
	return MEMORY_FAILURE.test(String(reason)) ? new MemoryError('ffmpeg ran out of memory', { cause: reason }) : null;
}

// A rejected call (as opposed to a non-zero exit code) leaves the wasm module unusable.
function discardEngine(instance: FFmpeg) {
	if (ffmpeg !== instance) return;
	ffmpeg = null;
	loading = null;
	input = null;
	instance.terminate();
}

async function guard<T>(engine: FFmpeg, call: Promise<T>): Promise<T> {
	try {
		return await call;
	} catch (reason) {
		discardEngine(engine);
		throw asMemoryError(reason) ?? reason;
	}
}

async function createEngine(): Promise<FFmpeg> {
	const instance = new FFmpeg();
	try {
		await instance.load({
			coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
			wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
		});
	} catch (error) {
		instance.terminate();
		throw new EngineLoadError('ffmpeg core failed to load', { cause: error });
	}
	ffmpeg = instance;
	return instance;
}

function getEngine(): Promise<FFmpeg> {
	if (ffmpeg) return Promise.resolve(ffmpeg);
	if (!loading) {
		loading = createEngine().catch((error: unknown) => {
			loading = null;
			throw error;
		});
	}
	return loading;
}

export async function loadGifEngine(): Promise<void> {
	await getEngine();
}

// The selected video is written to the virtual FS once and reused by probe, frames, and conversion.
export async function prepareInput(video: SourceVideo): Promise<void> {
	if (input?.video === video) return input.ready;
	await releaseInput();
	selected = video;
	const name = `input.${video.format}`;
	const ready = getEngine().then(async (engine) => {
		const data = await fetchFile(video.file).catch((reason: unknown) => {
			throw asMemoryError(reason) ?? reason;
		});
		await guard(engine, engine.writeFile(name, data));
	});
	const current = { video, name, ready };
	input = current;
	ready.catch(() => {
		if (input === current) input = null;
	});
	return ready;
}

export async function releaseInput(): Promise<void> {
	selected = null;
	if (!input) return;
	const { name, ready } = input;
	input = null;
	await ready.catch(() => {});
	if (ffmpeg) await ffmpeg.deleteFile(name).catch(() => {});
}

async function currentInput(): Promise<{ engine: FFmpeg; name: string }> {
	if (!input) {
		if (!selected) throw new ConversionError('no video prepared');
		await prepareInput(selected);
	}
	if (!input) throw new ConversionError('no video prepared');
	const { name, ready } = input;
	await ready;
	return { engine: await getEngine(), name };
}

async function readAndDelete(engine: FFmpeg, path: string): Promise<Uint8Array | null> {
	const data = await engine.readFile(path).catch(() => null);
	await engine.deleteFile(path).catch(() => {});
	return data instanceof Uint8Array && data.length > 0 ? data : null;
}

const toSeconds = (match: RegExpMatchArray) => Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);

// Runs an ffmpeg command only for what it logs; a failed run still returns what was logged.
// A failed earlier call may have discarded the engine; currentInput re-prepares the input if so.
async function logOf(args: (name: string) => string[]): Promise<string> {
	const { engine, name } = await currentInput();
	const lines: string[] = [];
	const collect = ({ message }: { message: string }) => lines.push(message);
	engine.on('log', collect);
	try {
		// The log level outlives a call: after ffprobe's "-v error", ffmpeg would print no
		// "Duration:" or "time=" lines unless the level is raised again.
		await guard(engine, engine.exec(['-v', 'info', ...args(name)]));
	} catch (reason) {
		if (reason instanceof MemoryError) throw reason;
	} finally {
		engine.off('log', collect);
	}
	return lines.join('\n');
}

export async function probeDuration(): Promise<number> {
	const { engine, name } = await currentInput();
	const report = 'duration.txt';
	const probed = await guard(
		engine,
		engine.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', name, '-o', report]),
	)
		.then(() => readAndDelete(engine, report))
		.catch((reason: unknown) => {
			if (reason instanceof MemoryError) throw reason;
			return null;
		});
	let duration = probed ? Number.parseFloat(new TextDecoder().decode(probed)) : Number.NaN;

	if (!(duration > 0)) {
		// Fallback for cores without ffprobe: ffmpeg prints "Duration: 00:01:02.50" for any input.
		const match = (await logOf((name) => ['-hide_banner', '-i', name])).match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
		duration = match ? toSeconds(match) : Number.NaN;
	}

	if (!(duration > 0)) {
		// Recordings without a stored duration print "Duration: N/A". Copying the video stream
		// to nowhere, without decoding it, reports how far it got in its last "time=" line.
		const log = await logOf((name) => ['-hide_banner', '-i', name, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-']);
		const times = [...log.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
		duration = times.length > 0 ? toSeconds(times[times.length - 1]) : Number.NaN;
	}

	if (!(duration > 0) || !Number.isFinite(duration)) {
		throw new ConversionError('could not read video duration');
	}
	return duration;
}

let frameCount = 0;

export async function extractFrame(atSec: number): Promise<Blob> {
	const { engine, name } = await currentInput();
	// Unique per call: overlapping requests interleave their exec/read/delete messages.
	const output = `frame-${++frameCount}.jpg`;
	await guard(engine, engine.exec([
		'-ss', atSec.toFixed(1),
		'-i', name,
		'-frames:v', '1',
		'-vf', `scale='min(${FRAME_PREVIEW_WIDTH},iw)':-1`,
		output,
	]));
	const data = await readAndDelete(engine, output);
	if (!data) throw new ConversionError('ffmpeg produced no frame');
	return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' });
}

export async function convertToGif(
	video: SourceVideo,
	range: ClipRange,
	settings: OutputSettings,
	crop: Crop | null,
	playback: Playback,
	// A transparent PNG at the GIF's output size, laid over every frame; null for no text.
	textImage: Blob | null,
	onProgress?: (fraction: number) => void,
): Promise<Blob> {
	await prepareInput(video);
	const { engine, name } = await currentInput();
	const output = 'output.gif';
	const text = 'text.png';
	const { fps, width, quality } = settings;
	// Crop first so Max width applies to the kept area.
	const frames =
		(crop ? `${cropFilter(crop)},` : '') +
		speedFilter(playback) +
		`fps=${fps},scale='min(${width},iw)':-1:flags=lanczos`;
	const finish =
		directionFilter(playback) +
		`split[a][b];[a]palettegen=max_colors=${QUALITY_COLORS[quality]}[p];[b][p]paletteuse`;
	// overlay repeats the single PNG frame for the whole clip.
	const filterArgs = textImage
		? ['-i', text, '-filter_complex', `[0:v]${frames}[base];[base][1:v]overlay=0:0,${finish}`]
		: ['-vf', `${frames},${finish}`];

	const clipSec = range.endSec - range.startSec;
	// Speed and boomerang make the GIF longer or shorter than the clip.
	const gifSec = outputSec(range, playback);
	const lines: string[] = [];
	const collect = ({ message }: { message: string }) => lines.push(message);
	// `time` is the output position in microseconds; -ss before -i makes it start at 0.
	const report = ({ time }: { time: number }) => onProgress?.(Math.min(Math.max(time / 1e6 / gifSec, 0), 1));
	engine.on('log', collect);
	engine.on('progress', report);

	try {
		if (textImage) await guard(engine, engine.writeFile(text, new Uint8Array(await textImage.arrayBuffer())));
		const exitCode = await guard(engine, engine.exec([
			'-ss', range.startSec.toFixed(1),
			'-t', clipSec.toFixed(1),
			'-i', name,
			...filterArgs,
			'-loop', '0',
			output,
		]));
		if (exitCode !== 0) {
			throw lines.some((line) => UNSUPPORTED_CONTENTS.test(line))
				? new UnsupportedVideoError('ffmpeg cannot decode this video')
				: new ConversionError(`ffmpeg exited with code ${exitCode}`);
		}
	} catch (error) {
		await engine.deleteFile(output).catch(() => {});
		throw error;
	} finally {
		engine.off('log', collect);
		engine.off('progress', report);
		if (textImage) await engine.deleteFile(text).catch(() => {});
	}
	const data = await readAndDelete(engine, output);
	if (!data) throw new ConversionError('ffmpeg produced no GIF');
	return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
}
