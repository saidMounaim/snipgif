import { useMemo, type ReactNode } from 'react';
import { formatFileSize } from '../../lib/video-file';
import type { GifResult as GifResultData } from '../../lib/gif-engine';

export type ResultFeedback = { tone: 'status' | 'error'; text: string };

type Props = {
	result: GifResultData;
	fileName: string;
	alt: string;
	onFeedback: (feedback: ResultFeedback | null) => void;
	// Extra detail under the heading, such as the size saved by compression.
	children?: ReactNode;
};

const SHARE_ERROR = "We couldn't share this GIF. Use Download instead.";
const COPY_ERROR = "We couldn't copy this GIF. Use Download instead.";
const COPY_DONE = 'GIF copied to the clipboard.';

const BUTTON_FOCUS = 'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-line';

export default function GifResult({ result, fileName, alt, onFeedback, children }: Props) {
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
		<section aria-labelledby="gif-result-heading" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-none">
			<div className="flex flex-col gap-1">
				<h2 id="gif-result-heading" className="text-lg font-semibold text-fg">
					Your GIF
				</h2>
				<p className="text-sm text-fg-muted">{formatFileSize(result.sizeBytes)}</p>
				{children}
			</div>
			<img
				src={result.objectUrl}
				alt={alt}
				className="h-auto max-w-full self-center rounded-xl border border-line"
			/>
			{/* Stays in view at the bottom of small screens while the result is on screen. */}
			<div className="sticky bottom-4 flex flex-wrap gap-3 sm:static">
				<a
					href={result.objectUrl}
					download={fileName}
					onClick={() => onFeedback(null)}
					className={`rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-accent-hover sm:shadow-none ${BUTTON_FOCUS}`}
				>
					Download GIF
				</a>
				{canCopy ? (
					<button
						type="button"
						onClick={copy}
						className={`rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted ${BUTTON_FOCUS}`}
					>
						Copy GIF
					</button>
				) : null}
				{canShare ? (
					<button
						type="button"
						onClick={share}
						className={`rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted ${BUTTON_FOCUS}`}
					>
						Share
					</button>
				) : null}
			</div>
		</section>
	);
}
