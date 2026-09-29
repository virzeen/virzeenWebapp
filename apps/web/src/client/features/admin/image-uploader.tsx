"use client";

import { Button, FormField, Input } from "@virzeen/ui";
import { ImagePlus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { getUploadSignatureAction } from "@/server/actions/admin/catalog";
import { keepFocusOnPress } from "./form-focus";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 10 * 1024 * 1024;

type ImageUploaderProps = {
  folder: "products" | "portfolio";
  entityId: string;
  uploadsEnabled: boolean;
  onUploaded: (imageRef: string) => void;
  label?: string;
};

/**
 * Uploads straight from the browser to Cloudinary with server-signed parameters (project-brief.md §10).
 * Without Cloudinary keys (local development) it accepts an image reference instead.
 */
export function ImageUploader({
  folder,
  entityId,
  uploadsEnabled,
  onUploaded,
  label = "Add image",
}: ImageUploaderProps) {
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRef, setManualRef] = useState("");

  async function upload(file: File) {
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) return setError("Choose a JPG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES)
      return setError("Images must be 10 MB or smaller. Compress it to about 2500px first.");
    setBusy(true);
    try {
      const signature = await getUploadSignatureAction({ folder, entityId });
      if (!signature.ok) return setError(messageFor(signature.error));
      const body = new FormData();
      body.append("file", file);
      for (const [key, value] of Object.entries(signature.data.fields)) body.append(key, value);
      const response = await fetch(signature.data.uploadUrl, { method: "POST", body });
      if (!response.ok) return setError("Upload failed. Please try again.");
      const result = (await response.json()) as { public_id?: string };
      if (result.public_id) onUploaded(result.public_id);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  // data-image-uploader: the product form sends focus here once the last image is removed.
  // keepFocusOnPress: pressing the button mustn't blur a form field first (its error line would move the button).
  if (!uploadsEnabled) {
    return (
      <div
        data-image-uploader
        className="flex flex-col gap-2 rounded-md border border-dashed border-line-strong p-4"
      >
        <FormField
          label="Image reference"
          helper="Uploads switch on when Cloudinary keys are set. For now, enter a Cloudinary public id or a /public path."
          error={error ?? undefined}
        >
          <Input
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            placeholder="/placeholder/product-01.jpg"
          />
        </FormField>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          className="self-start"
          disabled={manualRef.trim().length === 0}
          onMouseDown={keepFocusOnPress}
          onClick={() => {
            onUploaded(manualRef.trim());
            setManualRef("");
          }}
        >
          {label}
        </Button>
      </div>
    );
  }

  return (
    <div data-image-uploader className="flex flex-col gap-2">
      <input
        ref={fileInput}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        variant="secondary"
        shape="pill"
        loading={busy}
        className="self-start"
        onMouseDown={keepFocusOnPress}
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus className="size-4" strokeWidth={1.5} aria-hidden />
        {label}
      </Button>
      {error && <p className="text-small text-danger">{error}</p>}
    </div>
  );
}
