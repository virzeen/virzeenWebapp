import { Alert, Container } from "@virzeen/ui";

type ContentPageProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Shown while a policy is still being finalised by the owner. */
  draftNotice?: boolean;
  children: React.ReactNode;
};

/** Reading layout for about, help and legal pages (max 70ch line length). */
export function ContentPage({ eyebrow, title, intro, draftNotice = false, children }: ContentPageProps) {
  return (
    <Container width="narrow" className="flex flex-col gap-8 py-12 lg:py-20">
      <header className="flex flex-col gap-4">
        {eyebrow && <p className="text-caption text-ink-muted uppercase">{eyebrow}</p>}
        <h1 className="font-display text-h1">{title}</h1>
        {intro && <p className="text-body-lg text-ink-muted">{intro}</p>}
      </header>
      {draftNotice && (
        <Alert variant="info">
          We&apos;re finalising this policy before launch. If you have a question, contact us and we&apos;ll
          help.
        </Alert>
      )}
      <div className="flex max-w-prose flex-col gap-6 text-body text-ink">{children}</div>
    </Container>
  );
}

/** Section heading inside a ContentPage. */
export function ContentHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 font-display text-h3">{children}</h2>;
}
