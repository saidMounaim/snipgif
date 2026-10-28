import { useMemo } from 'react';
import { formatFileSize, gifFileName } from '../../lib/video-file';
import type { GifResult as GifResultData } from '../../lib/gif-engine';

export type ResultFeedback = { tone: 'status' | 'error'; text: string };

type Props = {
	result: GifResultData;
	videoName: string;
	onFeedback: (feedback: ResultFeedback | null) => void;
};

const SHARE_ERROR = "We couldn't share this GIF. Use Download instead.";
const COPY_ERROR = "We couldn't copy this GIF. Use Download instead.";
const COPY_DONE = 'GIF copied to the clipboard.';

const BUTTON_FOCUS = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600';

export default function GifResult({ result, videoName, onFeedback }: Props) {
	const fileName = gifFileName(videoName);
	const file = useMemo(
		() => new File([result.blob], fileName, { type: 'image/gif' }),
		[result.blob, fileName],
	);
	const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
	// Most browsers only accept PNG images, so copy is offered only where GIF writes are supported.
	const canCopy =
		typeof ClipboardItem !== 'undefined' &&
		typeof navigator.clipboard?.write === 'function' &&
		(ClipboardItem as { supports?: (type: string) => boolean }).supports?.('image/gif') === true;

	async function copy() {
		onFeedback(null);
		try {
			await navigator.clipboard.write([new ClipboardItem({ 'image/gif': result.blob })]);
			onFeedback({ tone: 'status', text: COPY_DONE });
		} catch {
			onFeedback({ tone: 'error', text: COPY_ERROR });
		}
	}

	async function share() {
		onFeedback(null);
		try {
			await navigator.share({ files: [file] });
		} catch (caught) {
			// Closing the share sheet rejects with AbortError; that is not a failure.
			if (caught instanceof DOMException && caught.name === 'AbortError') return;
			onFeedback({ tone: 'error', text: SHARE_ERROR });
		}
	}

	return (
		<section aria-labelledby="gif-result-heading" className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
			<div className="flex flex-col gap-1">
				<h2 id="gif-result-heading" className="text-lg font-semibold text-zinc-900">
					Your GIF
				</h2>
				<p className="text-sm text-zinc-600">{formatFileSize(result.sizeBytes)}</p>
			</div>
			<img
				src={result.objectUrl}
				alt={`GIF made from ${videoName}`}
				className="h-auto max-w-full self-center rounded-xl border border-zinc-200"
			/>
			{/* Stays in view at the bottom of small screens while the result is on screen. */}
			<div className="sticky bottom-4 flex flex-wrap gap-3 sm:static">
				<a
					href={result.objectUrl}
					download={fileName}
					onClick={() => onFeedback(null)}
					className={`rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-violet-700 sm:shadow-none ${BUTTON_FOCUS}`}
				>
					Download GIF
				</a>
				{canCopy ? (
					<button
						type="button"
						onClick={copy}
						className={`rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 ${BUTTON_FOCUS}`}
					>
						Copy GIF
					</button>
				) : null}
				{canShare ? (
					<button
						type="button"
						onClick={share}
						className={`rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 ${BUTTON_FOCUS}`}
					>
						Share
					</button>
				) : null}
			</div>
		</section>
	);
}
