"use client";

import { useFormState, useWatch } from "react-hook-form";
import { styleEntryIndex } from "./content-helpers";
import { EditableText } from "./editable-text";
import { useProductEditor } from "./editor-context";

/**
 * The bullets under the description for the picked style, as the shop shows them (colour-shown.tsx): "Colour shown"
 * with a pencil (the style's entry in `styles`), and "Style: {style number}", read-only ("Made when saved" until
 * the first save gives a new style its number).
 */
export function StyleBulletsEditor() {
  const { form, style, styles, commitField } = useProductEditor();
  const entries = useWatch({ control: form.control, name: "styles" });
  const { errors } = useFormState({ control: form.control, name: "styles" });
  const index = styleEntryIndex(entries, style);
  const entry = entries[index];
  const colourShown = entry?.colourShown?.trim() ?? "";
  const code = entry?.code?.trim() ?? "";
  const named = styles.length > 0;

  // Normally every style has an entry; one missing is added with its colour shown (the save gives it a number).
  const commit = (next: string) =>
    entry
      ? commitField(`styles.${index}.colourShown`, next)
      : commitField("styles", [...entries, { color: style, colourShown: next, code: "" }]);

  return (
    <>
      <li>
        <EditableText
          label="Colour shown"
          editLabel={named ? `colour shown of ${style}` : "colour shown"}
          value={colourShown}
          // A style without one shows its name, as in the shop; a product without styles shows nothing there.
          placeholder={named ? undefined : "Add the colour shown"}
          inputProps={{ placeholder: named ? style : "e.g. Black/White" }}
          error={entry ? errors.styles?.[index]?.colourShown?.message : undefined}
          onCommit={commit}
        >
          <p>Colour shown: {colourShown || style}</p>
        </EditableText>
      </li>
      <li>Style: {code || <span className="text-ink-muted">Made when saved</span>}</li>
    </>
  );
}

/** "Country/Region of origin: {country}" with a pencil. Blank hides the line in the shop. */
export function OriginBulletEditor() {
  const { form, commitField } = useProductEditor();
  const country = useWatch({ control: form.control, name: "countryOfOrigin" }) ?? "";
  const { errors } = useFormState({ control: form.control, name: "countryOfOrigin" });

  return (
    <li>
      <EditableText
        label="Country/Region of origin"
        editLabel="country/region of origin"
        value={country}
        placeholder="Add the country or region of origin"
        inputProps={{ placeholder: "e.g. China", maxLength: 60 }}
        error={errors.countryOfOrigin?.message}
        onCommit={(next) => commitField("countryOfOrigin", next)}
      >
        <p>Country/Region of origin: {country}</p>
      </EditableText>
    </li>
  );
}
