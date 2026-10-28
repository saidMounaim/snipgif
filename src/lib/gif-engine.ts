import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { SourceVideo } from './video-file';

export const GIF_SETTINGS = { fps: 10, maxWidth: 480, maxSeconds: 30 } as const;

// Single-threaded core: the multi-threaded one needs COOP/COEP headers, which break AdSense.
const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

export class EngineLoadError extends Error {}
export class ConversionError extends Error {}

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

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

export async function convertToGif(video: SourceVideo): Promise<Blob> {
	const engine = await getEngine();
	const input = `input.${video.format}`;
	const output = 'output.gif';
	const { fps, maxWidth, maxSeconds } = GIF_SETTINGS;
	const filter =
		`fps=${fps},scale='min(${maxWidth},iw)':-1:flags=lanczos,` +
		'split[a][b];[a]palettegen[p];[b][p]paletteuse';

	try {
		await engine.writeFile(input, await fetchFile(video.file));
		const exitCode = await engine.exec([
			'-t', String(maxSeconds),
			'-i', input,
			'-vf', filter,
			'-loop', '0',
			output,
		]);
		if (exitCode !== 0) throw new ConversionError(`ffmpeg exited with code ${exitCode}`);

		const data = await engine.readFile(output).catch(() => null);
		if (!(data instanceof Uint8Array) || data.length === 0) {
			throw new ConversionError('ffmpeg produced no GIF');
		}
		return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
	} finally {
		await Promise.allSettled([engine.deleteFile(input), engine.deleteFile(output)]);
	}
}
