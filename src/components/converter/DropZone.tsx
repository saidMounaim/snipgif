import { useRef, useState, type DragEvent, type RefObject } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

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
				className={cn(
					'group flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed bg-card/80 px-6 py-16 text-center shadow-xl shadow-primary/5 backdrop-blur transition-all outline-none focus-visible:ring-4 focus-visible:ring-ring sm:py-20',
					dragging
						? 'border-primary bg-accent motion-safe:scale-[1.01]'
						: 'border-input hover:border-primary hover:bg-accent/40',
				)}
			>
				<span
					aria-hidden="true"
					className="flex size-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-primary/30 transition-transform motion-safe:group-hover:-translate-y-1"
				>
					<Upload className="size-7" />
				</span>
				<span className="flex flex-col gap-1">
					<span className="text-lg font-semibold text-foreground">{title}</span>
					<span className="text-sm text-muted-foreground">{hint}</span>
				</span>
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
