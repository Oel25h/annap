import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { uploadMedia } from "@/lib/media";
import { PillButton } from "./ui";

export function ImageUploader({
  folder,
  multiple = false,
  onUploaded,
  label = "Upload photo",
}: {
  folder: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void | Promise<void>;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadMedia(f, folder));
      }
      await onUploaded(urls);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      console.error("[ImageUploader]", e);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <PillButton type="button" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </PillButton>
      {error && (
        <p className="max-w-sm text-xs text-terracotta" role="alert">
          {error}
        </p>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
