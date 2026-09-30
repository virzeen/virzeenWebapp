import { Accordion, AccordionItem, Container, Link, VisuallyHidden } from "@virzeen/ui";
import { Globe } from "lucide-react";
import { InstallAppButton, InstallAppGuide } from "@/client/components/shared/install-app";
import { LogoMark } from "./logo-mark";

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

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

/**
 * Global footer, laid out like Nike's (owner request 2026-09-30): white, a hairline on top, grey links under black
 * titles. Computers show every column; phones show one tap-to-open section per column. Then the country and the
 * legal line.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-canvas text-ink">
      <Container>
        <div className="border-t border-line pt-4 md:grid md:grid-cols-4 md:pt-16 lg:grid-cols-5">
          {/* Phones: the first section open, like Nike's. */}
          <Accordion type="multiple" defaultValue={[COLUMNS[0].title]} className="border-t-0 md:hidden">
            {COLUMNS.map((column) => (
              <AccordionItem key={column.title} value={column.title} title={column.title} headingLevel={2}>
                <nav aria-label={column.title}>
                  <ul className="flex flex-col">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          variant="subtle"
                          className="inline-flex min-h-11 items-center text-body font-medium"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </AccordionItem>
            ))}
          </Accordion>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="hidden md:block">
              <h2 className="text-small font-medium text-ink">{column.title}</h2>
              <ul className="mt-6 flex flex-col gap-3 text-small font-medium">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} variant="subtle">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="flex flex-col items-start gap-4 border-b border-line py-6 md:items-end md:border-b-0 md:py-0 lg:col-span-2">
            <p className="flex items-center gap-2 text-small font-medium text-ink-muted">
              <Globe className="size-4" strokeWidth={1.5} aria-hidden />
              <VisuallyHidden>Country: </VisuallyHidden>
              Nepal
            </p>
            <InstallAppButton placement="footer" />
          </div>
        </div>
        <div className="flex flex-col gap-1 pt-6 pb-10 text-small font-medium text-ink-muted md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:pt-20 md:pb-12">
          <p className="flex min-h-11 items-center gap-2 md:min-h-0">
            <LogoMark className="size-4 shrink-0 text-ink" />© {new Date().getFullYear()} Virzeen. All rights
            reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-col md:flex-row md:gap-6">
              {LEGAL.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    variant="subtle"
                    className="inline-flex min-h-11 items-center md:min-h-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="pt-4 font-light md:ml-auto md:pt-0">timeless monochromium experience.</p>
        </div>
      </Container>
      <InstallAppGuide />
    </footer>
  );
}
