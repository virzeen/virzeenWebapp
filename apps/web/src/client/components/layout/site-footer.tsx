import { Container, Link, Separator } from "@virzeen/ui";
import { InstallAppButton, InstallAppGuide } from "@/client/components/shared/install-app";
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

/** Global footer on ink: brand, navigation, legal. */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-canvas">
      <Container className="flex flex-col gap-12 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-4">
            <Wordmark className="h-6 w-auto self-start" title="Virzeen" />
            <p className="text-small font-light text-canvas/70">timeless monochromium experience.</p>
            <InstallAppButton placement="footer" />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-16">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title} className="flex flex-col gap-1">
                <p className="pb-2 text-caption text-canvas/60 uppercase">{column.title}</p>
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    variant="subtle"
                    className="inline-flex min-h-11 items-center text-small text-canvas/85 hover:text-canvas lg:min-h-9"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <Separator className="bg-canvas/15" />
        <div className="flex flex-col gap-4 text-small text-canvas/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="size-6 text-canvas" />
            <p>© {new Date().getFullYear()} Virzeen. Prices include 13% VAT.</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              variant="subtle"
              className="inline-flex min-h-11 items-center text-canvas/70 hover:text-canvas"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              variant="subtle"
              className="inline-flex min-h-11 items-center text-canvas/70 hover:text-canvas"
            >
              Terms
            </Link>
          </div>
        </div>
      </Container>
      <InstallAppGuide />
    </footer>
  );
}
