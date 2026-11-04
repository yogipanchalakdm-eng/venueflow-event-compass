import { Download, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/components/form/AttachmentsField";

export function Attachments({ files }: { files: { path: string; name: string; size: number }[] }) {
  if (!files?.length) return null;
  const open = async (path: string) => {
    const { data, error } = await supabase.storage.from("request-attachments").createSignedUrl(path, 300);
    if (error || !data) return void toast.error("Couldn't open that file");
    window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Paperclip className="h-4 w-4" /> Attachments
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <button key={f.path} onClick={() => open(f.path)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:border-account">
            <Download className="h-3.5 w-3.5" /> {f.name} <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
