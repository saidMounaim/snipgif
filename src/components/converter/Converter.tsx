import { useEffect, useRef, useState } from 'react';
import DropZone from './DropZone';
import {
	formatFileSize,
	validateVideoFiles,
	type SourceVideo,
	type VideoFileError,
	type VideoFileWarning,
} from '../../lib/video-file';

const ERROR_MESSAGES: Record<VideoFileError, string> = {
	multiple: 'Please drop one video at a time.',
	empty: 'This file is empty. Please choose another video.',
	unsupported:
		"This file type isn't supported. Please choose an MP4, MOV, WebM, or AVI video.",
};

const WARNING_MESSAGES: Record<VideoFileWarning, string> = {
	large:
		'This video is over 200 MB. Large videos can be slow or fail on some devices, especially phones.',
};

const ERROR_ID = 'video-upload-error';

export default function Converter() {
	const [video, setVideo] = useState<SourceVideo | null>(null);
	const [error, setError] = useState<VideoFileError | null>(null);
	const [warning, setWarning] = useState<VideoFileWarning | null>(null);
	const dropZoneRef = useRef<HTMLButtonElement>(null);
	const selectedRef = useRef<HTMLHeadingElement>(null);
	const returnFocusRef = useRef<'dropzone' | 'selected' | null>(null);

	// Without this, a file dropped outside the zone makes the browser navigate to it.
	useEffect(() => {
		const preventFileOpen = (event: DragEvent) => {
			if (event.defaultPrevented || !event.dataTransfer?.types.includes('Files')) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = 'none';
		};
		window.addEventListener('dragover', preventFileOpen);
		window.addEventListener('drop', preventFileOpen);
		return () => {
			window.removeEventListener('dragover', preventFileOpen);
			window.removeEventListener('drop', preventFileOpen);
		};
	}, []);

	useEffect(() => {
		if (returnFocusRef.current === 'selected') selectedRef.current?.focus();
		if (returnFocusRef.current === 'dropzone') dropZoneRef.current?.focus();
		returnFocusRef.current = null;
	}, [video]);

	function handleFiles(files: FileList) {
		const result = validateVideoFiles(files);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setError(null);
		setWarning(result.warning);
		setVideo(result.video);
		returnFocusRef.current = 'selected';
	}

	function chooseAnother() {
		setVideo(null);
		setError(null);
		setWarning(null);
		returnFocusRef.current = 'dropzone';
	}

	return (
		<div className="flex flex-col gap-4">
			{video ? (
				<div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
					<div className="flex flex-col gap-1">
						<h2
							ref={selectedRef}
							tabIndex={-1}
							className="break-all text-lg font-semibold text-zinc-900 focus:outline-none"
						>
							{video.name}
						</h2>
						<p className="text-sm text-zinc-600">
							{formatFileSize(video.sizeBytes)} · {video.format.toUpperCase()}
						</p>
					</div>
					<button
						type="button"
						onClick={chooseAnother}
						className="self-start rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
					>
						Choose another video
					</button>
				</div>
			) : (
				<DropZone onFiles={handleFiles} describedBy={ERROR_ID} buttonRef={dropZoneRef} />
			)}

			<p id={ERROR_ID} role="alert" className="text-sm font-medium text-red-700 empty:hidden">
				{error ? ERROR_MESSAGES[error] : ''}
			</p>
			<p aria-live="polite" className="text-sm font-medium text-amber-800 empty:hidden">
				{video && warning ? WARNING_MESSAGES[warning] : ''}
			</p>
		</div>
	);
}
