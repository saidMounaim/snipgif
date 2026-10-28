import { useRef, useState, type DragEvent, type RefObject } from 'react';

interface DropZoneProps {
	title: string;
	hint: string;
	accept: string;
	onFiles: (files: FileList) => void;
	describedBy: string;
	buttonRef: RefObject<HTMLButtonElement | null>;
}

export default function DropZone({ title, hint, accept, onFiles, describedBy, buttonRef }: DropZoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	function handleDragOver(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		setDragging(true);
	}

	function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setDragging(false);
		}
	}

	function handleDrop(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		setDragging(false);
		if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
	}

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				aria-describedby={describedBy}
				className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-violet-600 ${
					dragging
						? 'border-violet-600 bg-violet-50'
						: 'border-zinc-300 bg-white hover:border-violet-400'
				}`}
			>
				<span className="text-lg font-semibold text-zinc-900">{title}</span>
				<span className="text-sm text-zinc-600">{hint}</span>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				tabIndex={-1}
				aria-hidden="true"
				className="sr-only"
				onChange={(event) => {
					const { files } = event.currentTarget;
					if (files && files.length > 0) onFiles(files);
					// Reset so picking the same file again still fires change.
					event.currentTarget.value = '';
				}}
			/>
		</>
	);
}
