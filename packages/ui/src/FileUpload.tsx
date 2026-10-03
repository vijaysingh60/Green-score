'use client';

import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface FileUploadProps {
  label?: ReactNode;
  hint?: ReactNode;
  accept?: string;
  multiple?: boolean;
  /** Called with the current full list of selected files. Nothing is uploaded by this component. */
  onFilesChange?: (files: File[]) => void;
  className?: string;
}

/** Drag-and-drop file picker. It only collects files; uploading is the caller's job. */
export function FileUpload({ label, hint, accept, multiple = true, onFilesChange, className }: FileUploadProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const update = (next: File[]) => {
    setFiles(next);
    onFilesChange?.(next);
  };
  const add = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const added = Array.from(incoming);
    update(multiple ? [...files, ...added] : added.slice(0, 1));
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  };

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>}
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/50',
        )}
      >
        <span aria-hidden className="text-2xl">📎</span>
        <span className="text-sm font-medium text-slate-700">Drop files here or click to browse</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            add(event.target.files);
            event.target.value = ''; // allow re-selecting the same file
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
            >
              <span className="truncate text-slate-700">{file.name}</span>
              <button
                type="button"
                onClick={() => update(files.filter((_, i) => i !== index))}
                className="shrink-0 text-xs font-medium text-slate-400 hover:text-rose-600"
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
