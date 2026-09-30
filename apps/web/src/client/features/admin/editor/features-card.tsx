"use client";

import { Button, cn } from "@virzeen/ui";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { EditableText } from "./editable-text";
import { altIsMade, featureName, madeFeatureAlt, type FeaturePart } from "./features-cards";
import { FeaturePicture } from "./features-picture";
import { useSortableFeature } from "./features-sortable";
import type { FeatureCardView } from "./features-state";

export type FeatureActions = {
  edit: (key: string, part: FeaturePart, value: string) => string | null;
  editAlt: (key: string, value: string) => string | null;
  setPicture: (key: string, url: string) => string | null;
  move: (card: FeatureCardView, by: 1 | -1) => void;
  remove: (card: FeatureCardView) => void;
};

type FeatureCardProps = {
  card: FeatureCardView;
  first: boolean;
  last: boolean;
  productName: string;
  /** Problems from the last save, on this feature's fields. */
  errors?: {
    title?: string | undefined;
    body?: string | undefined;
    alt?: string | undefined;
    imageUrl?: string | undefined;
  };
  actions: FeatureActions;
};

const ICON = { className: "size-5", strokeWidth: 1.5, "aria-hidden": true } as const;

/**
 * One feature in the editor's simple grid (specs/product-page-v2.md "Editor"): a square thumbnail with a button in
 * each corner, always shown (owner, 2026-09-30: not only on hover): Replace picture (top left), Remove (top right,
 * asks first), Move earlier (bottom left, ←) and Move later (bottom right, →), as the grid reads in list order. Under
 * it, pencils on the title, the text (both optional) and the picture description. Buttons carry data-action, so
 * focus can follow a moved or removed card. The list item itself, so it sits straight in the grid. The picture also
 * drags the card to a new place (FeatureSortable); the dragged card is lifted over the others.
 */
export function FeatureCard({ card, first, last, productName, errors, actions }: FeatureCardProps) {
  const name = featureName(card.title, card.index);
  const made = madeFeatureAlt(productName, card.title);
  const altMade = altIsMade(card.alt, productName, card.title);
  // A single feature has nowhere to go, like its disabled arrows.
  const { setItemRef, moving, dragging, handle } = useSortableFeature(card.key, first && last);

  return (
    <li
      ref={setItemRef}
      style={moving}
      data-feature={card.key}
      className={cn("flex min-w-0 flex-col gap-3", dragging && "z-10 opacity-90")}
    >
      <FeaturePicture
        imageUrl={card.imageUrl}
        alt={altMade ? made : card.alt}
        name={name}
        error={errors?.imageUrl}
        onUploaded={(url) => actions.setPicture(card.key, url)}
        drag={handle}
      >
        <div className="absolute top-2 right-2">
          <Button
            variant="secondary"
            size="icon"
            shape="pill"
            aria-label={`Remove ${name}`}
            data-action="remove"
            onClick={() => actions.remove(card)}
          >
            <Trash2 {...ICON} />
          </Button>
        </div>
        <div className="absolute bottom-2 left-2">
          <Button
            variant="secondary"
            size="icon"
            shape="pill"
            aria-label={`Move ${name} earlier`}
            data-action="earlier"
            disabled={first}
            onClick={() => actions.move(card, -1)}
          >
            <ArrowLeft {...ICON} />
          </Button>
        </div>
        <div className="absolute right-2 bottom-2">
          <Button
            variant="secondary"
            size="icon"
            shape="pill"
            aria-label={`Move ${name} later`}
            data-action="later"
            disabled={last}
            onClick={() => actions.move(card, 1)}
          >
            <ArrowRight {...ICON} />
          </Button>
        </div>
      </FeaturePicture>
      <div className="flex flex-col gap-2">
        <div data-part="title">
          <EditableText
            label="Title"
            editLabel={`title of ${name}`}
            value={card.title}
            placeholder="Add a title (optional)"
            error={errors?.title}
            inputProps={{ maxLength: 60 }}
            onCommit={(next) => actions.edit(card.key, "title", next)}
          >
            <h3 className="font-medium break-words">{card.title}</h3>
          </EditableText>
        </div>
        <div data-part="body">
          <EditableText
            label="Text"
            editLabel={`text of ${name}`}
            multiline
            value={card.body}
            placeholder="Add text (optional)"
            error={errors?.body}
            textareaProps={{ rows: 4, maxLength: 400 }}
            onCommit={(next) => actions.edit(card.key, "body", next)}
          >
            <p className="text-small break-words whitespace-pre-line text-ink-muted">{card.body}</p>
          </EditableText>
        </div>
        {/* A made description shows as made and saves as "", so it follows the name and title. */}
        <EditableText
          label="Picture description"
          editLabel={`picture description of ${name}`}
          value={altMade ? "" : card.alt}
          error={errors?.alt}
          inputProps={{ placeholder: made, maxLength: 200 }}
          onCommit={(next) => actions.editAlt(card.key, next)}
        >
          <p className="text-small break-words text-ink-muted">
            Picture description: {altMade ? made : card.alt}
          </p>
        </EditableText>
      </div>
    </li>
  );
}
