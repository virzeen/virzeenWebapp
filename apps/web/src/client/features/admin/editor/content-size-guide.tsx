"use client";

import { Link } from "@virzeen/ui";
import { SIZE_GUIDE_KIND_LABELS, type SizeGuideKind } from "@virzeen/validators";
import { useFormState, useWatch } from "react-hook-form";
import { SizeGuideDialog } from "@/client/features/products/size-guide-dialog";
import { EditableSelect } from "./editable-select";
import { useProductEditor } from "./editor-context";

// The select can't hold "" as an option's value (Radix), so "No size guide" has its own; the form keeps "".
const NO_GUIDE = "none";

/** A guide's name with its type, e.g. "T-shirts (Clothing)", so a size table and a picture guide aren't mixed up. */
const guideLabel = (guide: { name: string; kind: SizeGuideKind }) =>
  `${guide.name} (${SIZE_GUIDE_KIND_LABELS[guide.kind]})`;

/**
 * Inside "Size and fit": the size guide picker (pencil → a select of the active guides with their type,
 * specs/size-guides.md) and, with a guide picked, what customers see there: its fit tips and the "Size guide" button
 * with the same popup (a table or a picture). Then "Manage size guides".
 */
export function SizeGuidePicker() {
  const { form, options, commitField } = useProductEditor();
  const sizeGuideId = useWatch({ control: form.control, name: "sizeGuideId" }) ?? "";
  const { errors } = useFormState({ control: form.control, name: "sizeGuideId" });
  const guide = options.sizeGuides.find((candidate) => candidate.id === sizeGuideId);
  const choices = [
    { value: NO_GUIDE, label: "No size guide" },
    ...options.sizeGuides.map((candidate) => ({ value: candidate.id, label: guideLabel(candidate) })),
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      <EditableSelect
        label="Size guide"
        value={sizeGuideId || NO_GUIDE}
        options={choices}
        error={errors.sizeGuideId?.message}
        onCommit={(next) => commitField("sizeGuideId", next === NO_GUIDE ? "" : next)}
        className="w-full"
      >
        <p className="text-ink">
          {guide
            ? `Size guide: ${guideLabel(guide)}`
            : sizeGuideId
              ? "This size guide can't be shown. Choose another."
              : "No size guide. Customers don't see Size and fit."}
        </p>
      </EditableSelect>
      {guide?.fitTips && <p className="whitespace-pre-line">{guide.fitTips}</p>}
      {guide && <SizeGuideDialog guide={guide} />}
      <Link href="/admin/size-guides" className="inline-flex min-h-11 items-center text-small">
        Manage size guides
      </Link>
    </div>
  );
}
