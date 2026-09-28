import { ButtonLink, Container, EmptyState } from "@virzeen/ui";

export default function NotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        title="We couldn't find that page."
        description="It may have moved, or the link might be wrong."
        action={
          <ButtonLink href="/shop" shape="pill">
            Browse the collection
          </ButtonLink>
        }
      />
    </Container>
  );
}
