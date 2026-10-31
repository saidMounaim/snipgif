import { useMemo, type ReactNode } from 'react';
import { CheckCircle2, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
		<section
			aria-labelledby="gif-result-heading"
			className="flex motion-safe:animate-in flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 fade-in slide-in-from-bottom-4 duration-500 sm:p-8"
		>
			<div className="flex items-start gap-3">
				<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
					<CheckCircle2 className="size-5" />
				</span>
				<div className="flex flex-col gap-1">
					<h2 id="gif-result-heading" className="text-lg font-semibold text-foreground">
						Your GIF
					</h2>
					<p className="text-sm text-muted-foreground">{formatFileSize(result.sizeBytes)}</p>
					{children}
				</div>
			</div>
			<div className="flex justify-center rounded-2xl bg-muted/60 p-3 ring-1 ring-border ring-inset">
				<img src={result.objectUrl} alt={alt} className="h-auto max-w-full rounded-xl shadow-md" />
			</div>
			{/* Stays in view at the bottom of small screens while the result is on screen. */}
			<div className="sticky bottom-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
				<Button asChild variant="brand" size="lg">
					<a href={result.objectUrl} download={fileName} onClick={() => onFeedback(null)}>
						<Download aria-hidden="true" />
						Download GIF
					</a>
				</Button>
				{canCopy ? (
					<Button type="button" variant="outline" size="lg" onClick={copy}>
						<Copy aria-hidden="true" />
						Copy GIF
					</Button>
				) : null}
				{canShare ? (
					<Button type="button" variant="outline" size="lg" onClick={share}>
						<Share2 aria-hidden="true" />
						Share
					</Button>
				) : null}
			</div>
		</section>
	);
}
