import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ClipRange } from './clip-range';
import type { SourceVideo } from './video-file';

export const GIF_SETTINGS = { fps: 10, maxWidth: 480 } as const;

// Single-threaded core: the multi-threaded one needs COOP/COEP headers, which break AdSense.
const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

export class EngineLoadError extends Error {}
export class ConversionError extends Error {}

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let input: { video: SourceVideo; name: string; ready: Promise<void> } | null = null;

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
	const name = `input.${video.format}`;
	const ready = getEngine().then(async (engine) => {
		await engine.writeFile(name, await fetchFile(video.file));
	});
	const current = { video, name, ready };
	input = current;
	ready.catch(() => {
		if (input === current) input = null;
	});
	return ready;
}

export async function releaseInput(): Promise<void> {
	if (!input) return;
	const { name, ready } = input;
	input = null;
	await ready.catch(() => {});
	if (ffmpeg) await ffmpeg.deleteFile(name).catch(() => {});
}

async function currentInput(): Promise<{ engine: FFmpeg; name: string }> {
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

export async function probeDuration(): Promise<number> {
	const { engine, name } = await currentInput();
	const report = 'duration.txt';
	const probed = await engine
		.ffprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', name, '-o', report])
		.then(() => readAndDelete(engine, report))
		.catch(() => null);
	let duration = probed ? Number.parseFloat(new TextDecoder().decode(probed)) : Number.NaN;

	if (!(duration > 0)) {
		// Fallback for cores without ffprobe: ffmpeg prints "Duration: 00:01:02.50" for any input.
		const lines: string[] = [];
		const collect = ({ message }: { message: string }) => lines.push(message);
		engine.on('log', collect);
		await engine.exec(['-hide_banner', '-i', name]).catch(() => {});
		engine.off('log', collect);
		const match = lines.join('\n').match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
		duration = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : Number.NaN;
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
	const { maxWidth } = GIF_SETTINGS;
	await engine.exec([
		'-ss', atSec.toFixed(1),
		'-i', name,
		'-frames:v', '1',
		'-vf', `scale='min(${maxWidth},iw)':-1`,
		'-q:v', '4',
		output,
	]);
	const data = await readAndDelete(engine, output);
	if (!data) throw new ConversionError('ffmpeg produced no frame');
	return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' });
}

export async function convertToGif(video: SourceVideo, range: ClipRange): Promise<Blob> {
	await prepareInput(video);
	const { engine, name } = await currentInput();
	const output = 'output.gif';
	const { fps, maxWidth } = GIF_SETTINGS;
	const filter =
		`fps=${fps},scale='min(${maxWidth},iw)':-1:flags=lanczos,` +
		'split[a][b];[a]palettegen[p];[b][p]paletteuse';

	try {
		const exitCode = await engine.exec([
			'-ss', range.startSec.toFixed(1),
			'-t', (range.endSec - range.startSec).toFixed(1),
			'-i', name,
			'-vf', filter,
			'-loop', '0',
			output,
		]);
		if (exitCode !== 0) throw new ConversionError(`ffmpeg exited with code ${exitCode}`);
	} catch (error) {
		await engine.deleteFile(output).catch(() => {});
		throw error;
	}
	const data = await readAndDelete(engine, output);
	if (!data) throw new ConversionError('ffmpeg produced no GIF');
	return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
}
