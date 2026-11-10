import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

export type BackInStockEmailData = {
  siteUrl: string;
  productName: string;
  /** "Black / M", like a bag line. */
  variantLabel: string;
  /** The product page, opened in that style and size. */
  url: string;
};

/** "Notify me when it's back" (specs/notify-me.md): sent once, when the size the customer waited for is back. */
export function BackInStockEmail({ alert }: { alert: BackInStockEmailData }) {
  return (
    <EmailLayout preview={`${alert.productName} is back in stock`} siteUrl={alert.siteUrl} invitesReply>
      <Heading as="h1" className="m-0 text-h1 font-normal">
        It&apos;s back.
      </Heading>
      <Text className="text-body">
        {alert.productName}, {alert.variantLabel}, is back in stock. Get yours while it lasts.
      </Text>
      <Button href={alert.url} className="vz-button mt-4 rounded-full bg-ink px-6 py-3 text-body text-canvas">
        Shop now
      </Button>
      <Text className="vz-muted mt-8 text-small text-ink-muted">
        You asked us to email you when it was back. This is the only email we&apos;ll send about it.
      </Text>
    </EmailLayout>
  );
}
