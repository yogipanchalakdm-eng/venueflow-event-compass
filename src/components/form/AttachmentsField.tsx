import { useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { Label } from "./fields";

const MAX_BYTES = 15 * 1024 * 1024;
const OK_TYPE = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsField({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    const rejected: string[] = [];
    for (const f of Array.from(list)) {
      if (!OK_TYPE.test(f.type)) rejected.push(`${f.name} isn't an image or PDF`);
      else if (f.size > MAX_BYTES) rejected.push(`${f.name} is over 15 MB`);
      else if (next.length >= 10) rejected.push("Up to 10 files per request");
      else next.push(f);
    }
    setProblem(rejected.join(" · "));
    onChange(next);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div>
      <Label hint="Optional — images or PDFs, up to 15 MB each">Attachments</Label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-field px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <Paperclip className="h-4 w-4" /> Add files
      </button>
      <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => add(e.target.files)} />
      {problem && <p className="mt-1.5 text-sm text-destructive">{problem}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-field/60 px-3 py-2 text-sm">
              {f.type === "application/pdf" ? <FileText className="h-4 w-4 text-muted-foreground" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
