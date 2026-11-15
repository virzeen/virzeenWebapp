"use client";

import { RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { AUDIENCE_HELP, AUDIENCE_LABELS, AUDIENCES, type Audience } from "@virzeen/validators";

type AudienceFieldProps = {
  value: Audience;
  onChange: (next: Audience) => void;
  /** The ref of the first option, so a failed submit can focus it. */
  fieldRef?: React.Ref<HTMLDivElement>;
};

/**
 * Who may see a collection or a product (specs/catalog-groups-visibility.md): Public, MONO Members, or Monochrome Pass
 * members. Put it inside a `FormField label="Visibility"`. Anyone not allowed sees it as not found.
 */
export function AudienceField({ value, onChange, fieldRef }: AudienceFieldProps) {
  return (
    <RadioGroup ref={fieldRef} value={value} onValueChange={(next) => onChange(next as Audience)}>
      {AUDIENCES.map((audience) => (
        <RadioGroupItem
          key={audience}
          value={audience}
          label={AUDIENCE_LABELS[audience]}
          description={AUDIENCE_HELP[audience]}
        />
      ))}
    </RadioGroup>
  );
}
