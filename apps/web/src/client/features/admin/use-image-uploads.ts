"use client";

import type { UploadSignatureInput } from "@virzeen/validators";
import { useRef, useState } from "react";
import { messageFor } from "@/client/lib/error-messages";
import { getUploadSignatureAction } from "@/server/actions/admin/catalog";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 10 * 1024 * 1024;
const PARALLEL = 3;

export type PendingUpload = { key: string; name: string };
type Signature = { uploadUrl: string; fields: Record<string, string> };

function problemWith(file: File) {
  if (!IMAGE_ACCEPT.split(",").includes(file.type))
    return `${file.name}: choose a JPG, PNG, WebP or AVIF image.`;
  if (file.size > MAX_BYTES) return `${file.name} is over 10 MB. Compress it to about 2500px first.`;
  return null;
}

/** One direct upload to Cloudinary (project-brief.md §10); null when it fails. */
async function send(file: File, signature: Signature) {
  try {
    const body = new FormData();
    body.append("file", file);
    for (const [key, value] of Object.entries(signature.fields)) body.append(key, value);
    const response = await fetch(signature.uploadUrl, { method: "POST", body });
    if (!response.ok) return null;
    const result = (await response.json()) as { public_id?: string };
    return result.public_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Uploads several images at once with one server signature (it covers any file in the folder). `onUploaded` gets
 * each image in the order the files were chosen, as soon as it and the ones before it are done; a failed file is
 * named in `errors` and the rest carry on.
 */
export function useImageUploads(
  folder: UploadSignatureInput["folder"],
  entityId: string,
  onUploaded: (imageRef: string) => void,
) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const nextKey = useRef(0);

  /** `room`: how many more images fit (Infinity when there's no limit); `full` explains a cut. */
  async function upload(files: File[], room = Number.POSITIVE_INFINITY, full = "") {
    const problems: string[] = [];
    const accepted = files.filter((file) => {
      const problem = problemWith(file);
      if (problem) problems.push(problem);
      return !problem;
    });
    if (accepted.length > room) {
      problems.push(full);
      accepted.length = room;
    }
    setErrors(problems);
    if (accepted.length === 0) return;

    const items = accepted.map((file) => ({ file, key: `upload-${nextKey.current++}` }));
    const isOurs = (upload: PendingUpload) => items.some((item) => item.key === upload.key);
    setPending((current) => [...current, ...items.map(({ key, file }) => ({ key, name: file.name }))]);
    const signature = await getUploadSignatureAction({ folder, entityId });
    if (!signature.ok) {
      setPending((current) => current.filter((upload) => !isOurs(upload)));
      setErrors((current) => [...current, messageFor(signature.error)]);
      return;
    }

    const results: (string | null | undefined)[] = items.map(() => undefined);
    let flushed = 0;
    const flush = () => {
      while (flushed < items.length && results[flushed] !== undefined) {
        const ref = results[flushed];
        const key = items[flushed]?.key;
        if (ref) onUploaded(ref);
        setPending((current) => current.filter((upload) => upload.key !== key));
        flushed++;
      }
    };
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next++;
        const file = items[index]?.file;
        if (!file) return;
        const ref = await send(file, signature.data);
        results[index] = ref;
        if (!ref) setErrors((current) => [...current, `${file.name} didn't upload. Please try again.`]);
        flush();
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
  }

  return { pending, errors, upload };
}
