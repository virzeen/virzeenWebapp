"use client";

import { Badge, Button } from "@virzeen/ui";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from "lucide-react";
import { EditableText } from "./editable-text";
import { altIsMade, madeFeatureAlt, type FeaturePart } from "./features-cards";
import { FeaturePicture } from "./features-picture";
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
 * One "Features that perform" card as in the shop (picture 4:5, title, text), editable in place: an upload button
 * on the picture, pencils on the title, the text and the picture description; Move earlier / later and Remove on
 * the picture, shown on hover or focus from md with a mouse (always on touch). A new feature says "Not saved yet"
 * until it has a title and text. Buttons carry data-action, so focus can follow a moved or removed card.
 */
export function FeatureCard({ card, first, last, productName, errors, actions }: FeatureCardProps) {
  const name = card.title.trim() || (card.isNew ? "new feature" : `feature ${card.index + 1}`);
  const made = madeFeatureAlt(productName, card.title);
  const altMade = altIsMade(card.alt, productName, card.title);

  return (
    <li data-feature={card.key} className="group/feature flex flex-col gap-4">
      <FeaturePicture
        imageUrl={card.imageUrl}
        alt={altMade ? made : card.alt}
        name={name}
        error={errors?.imageUrl}
        onUploaded={(url) => actions.setPicture(card.key, url)}
      >
        {card.isNew && (
          <Badge variant="warning" className="absolute top-3 left-3">
            Not saved yet
          </Badge>
        )}
        <div className="absolute top-3 right-3 flex gap-1 transition-opacity duration-150 ease-standard md:pointer-fine:opacity-0 md:pointer-fine:group-focus-within/feature:opacity-100 md:pointer-fine:group-hover/feature:opacity-100">
          {!card.isNew && (
            <>
              <Button
                variant="secondary"
                size="icon"
                shape="pill"
                aria-label={`Move ${name} earlier`}
                data-action="earlier"
                disabled={first}
                onClick={() => actions.move(card, -1)}
              >
                <ArrowUp {...ICON} className="size-5 md:hidden" />
                <ArrowLeft {...ICON} className="size-5 max-md:hidden" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                shape="pill"
                aria-label={`Move ${name} later`}
                data-action="later"
                disabled={last}
                onClick={() => actions.move(card, 1)}
              >
                <ArrowDown {...ICON} className="size-5 md:hidden" />
                <ArrowRight {...ICON} className="size-5 max-md:hidden" />
              </Button>
            </>
          )}
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
      </FeaturePicture>
      <div className="flex flex-col gap-2 pr-6">
        <div data-part="title">
          <EditableText
            label="Title"
            editLabel={`title of ${name}`}
            value={card.title}
            placeholder="Add a title"
            error={errors?.title}
            inputProps={{ maxLength: 60 }}
            onCommit={(next) => actions.edit(card.key, "title", next)}
          >
            <h3 className="text-h3">{card.title}</h3>
          </EditableText>
        </div>
        <div data-part="body">
          <EditableText
            label="Text"
            editLabel={`text of ${name}`}
            multiline
            value={card.body}
            placeholder="Add text"
            error={errors?.body}
            textareaProps={{ rows: 4, maxLength: 400 }}
            onCommit={(next) => actions.edit(card.key, "body", next)}
          >
            <p className="whitespace-pre-line text-ink-muted">{card.body}</p>
          </EditableText>
        </div>
        {card.isNew ? (
          <p className="text-small text-ink-muted">Add a title and text to save this feature.</p>
        ) : (
          // A made description shows as made and saves as "", so it follows the name and title.
          <EditableText
            label="Picture description"
            editLabel={`picture description of ${name}`}
            value={altMade ? "" : card.alt}
            error={errors?.alt}
            inputProps={{ placeholder: made, maxLength: 200 }}
            onCommit={(next) => actions.editAlt(card.key, next)}
          >
            <p className="text-small text-ink-muted">Picture description: {altMade ? made : card.alt}</p>
          </EditableText>
        )}
      </div>
    </li>
  );
}
