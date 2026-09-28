import { Container, Link, Separator } from "@virzeen/ui";
import { LogoMark } from "./logo-mark";
import { Wordmark } from "./wordmark";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop?inStock=1", label: "In stock" },
      { href: "/cart", label: "Bag" },
    ],
  },
  {
    title: "Virzeen",
    links: [
      { href: "/about", label: "About" },
      { href: "/portfolio", label: "Portfolio" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
      { href: "/account/orders", label: "Track an order" },
    ],
  },
] as const;

/** Global footer on ink: brand, navigation, payment methods, legal. */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-canvas">
      <Container className="gap-12 py-16 flex flex-col">
        <div className="gap-12 md:flex-row md:justify-between flex flex-col">
          <div className="max-w-xs gap-4 flex flex-col">
            <Wordmark className="h-6 w-auto self-start" title="Virzeen" />
            <p className="text-small text-canvas/70">timeless monochromium experience.</p>
          </div>
          <div className="gap-8 sm:grid-cols-3 md:gap-16 grid grid-cols-2">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title} className="gap-1 flex flex-col">
                <p className="pb-2 text-caption text-canvas/60 uppercase">{column.title}</p>
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    variant="subtle"
                    className="min-h-11 md:min-h-9 inline-flex items-center text-small text-canvas/85 hover:text-canvas"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <Separator className="bg-canvas/15" />
        <div className="gap-4 md:flex-row md:items-center md:justify-between flex flex-col text-small text-canvas/60">
          <div className="gap-3 flex items-center">
            <LogoMark className="size-6 text-canvas" inverse />
            <p>© {new Date().getFullYear()} Virzeen. Prices include 13% VAT.</p>
          </div>
          <p>Cash on delivery · eSewa · Khalti</p>
          <div className="gap-4 flex">
            <Link href="/privacy" variant="subtle" className="text-canvas/70 hover:text-canvas">
              Privacy
            </Link>
            <Link href="/terms" variant="subtle" className="text-canvas/70 hover:text-canvas">
              Terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
