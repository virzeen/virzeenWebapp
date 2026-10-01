import { fontStack } from "@virzeen/ui/tokens";
import { describe, expect, it } from "vitest";
import { formatPaisa, renderOrderConfirmationEmail, renderOtpEmail } from "./index";

describe("formatPaisa", () => {
  it("formats paisa as rupees with Indian grouping", () => {
    expect(formatPaisa(125_000)).toBe("Rs 1,250");
    expect(formatPaisa(12_500_000)).toBe("Rs 1,25,000");
    expect(formatPaisa(125_050)).toBe("Rs 1,250.50");
  });
});

describe("renderOtpEmail", () => {
  it("renders the code in both the HTML and the plain-text version", async () => {
    const email = await renderOtpEmail({ otp: "482913", siteUrl: "https://virzeen.com" });
    expect(email.subject).toBe("482913 is your Virzeen sign-in code");
    expect(email.html).toContain("482913");
    expect(email.text).toContain("482913");
    // tests/e2e/helpers.ts reads the first 6-digit number in the text, so nothing may come before the code.
    expect(/\b(\d{6})\b/.exec(email.text)?.[1]).toBe("482913");
    // Tailwind classes are inlined for email clients; only the dark-mode hooks (vz-*) stay as classes.
    const classes = [...email.html.matchAll(/class="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/));
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((name) => name.startsWith("vz-"))).toBe(true);
  });

  it("swaps to a white wordmark and white-on-ink colours in dark mode, black on white otherwise", async () => {
    const email = await renderOtpEmail({ otp: "482913", siteUrl: "https://virzeen.com" });
    expect(email.html).toContain('<meta name="color-scheme" content="light dark"/>');
    expect(email.html).toContain("@media (prefers-color-scheme: dark)");
    expect(email.html).toContain("[data-ogsc] .vz-dark-only");
    // The ink wordmark shows by default (Gmail ignores the media query and keeps it).
    expect(email.html).toMatch(
      /<img class="vz-light-only"[^>]*src="https:\/\/virzeen\.com\/brand\/email-wordmark\.png"/,
    );
    // The white one is hidden until dark mode, from Outlook for Windows too.
    const dark = /<img class="vz-dark-only"[^>]*>/.exec(email.html)?.[0] ?? "";
    expect(dark).toContain('src="https://virzeen.com/brand/email-wordmark-dark.png"');
    expect(dark).toContain("display:none");
    expect(dark).toContain("mso-hide:all");
    expect(email.html).toContain('<body class="vz-page"');
  });

  it("stays readable in Outlook for Windows: no rem units, font set on every element", async () => {
    const email = await renderOtpEmail({ otp: "482913", siteUrl: "https://virzeen.com" });
    expect(email.html).not.toMatch(/[0-9]rem/);
    expect(email.html).toContain(`table, td, p, h1, h2, a { font-family: ${fontStack}; }`);
    expect(email.html).toContain("max-width:448px");
  });

  it("uses the shared frame without inviting replies (sign-in codes have no Reply-To)", async () => {
    const email = await renderOtpEmail({ otp: "482913", siteUrl: "https://virzeen.com" });
    expect(email.html).toContain('src="https://virzeen.com/brand/email-wordmark.png"');
    expect(email.html).toContain('alt="Virzeen"');
    expect(email.html).toContain('href="https://virzeen.com/privacy"');
    expect(email.html).toContain('href="https://virzeen.com/contact"');
    expect(email.html).toContain("virzeen.com</a>");
    expect(email.text).toContain("Your VIRZEEN Member Profile Code");
    expect(email.text).toContain("This code expires in 10 minutes.");
    expect(email.text).not.toContain("Reply to this email");
    expect(email.html).not.toContain("Reply to this email");
  });

  it("shows the site's own host, with its port when there is one", async () => {
    const email = await renderOtpEmail({ otp: "482913", siteUrl: "http://localhost:3000" });
    expect(email.html).toContain("localhost:3000</a>");
    expect(email.html).toContain('src="http://localhost:3000/brand/email-wordmark.png"');
  });
});

describe("renderOrderConfirmationEmail", () => {
  it("includes the order number, lines and totals", async () => {
    const email = await renderOrderConfirmationEmail({
      siteUrl: "https://virzeen.com",
      orderNumber: "VZ-260928-0042",
      customerName: "Asha",
      placedAt: new Date("2026-09-28T06:00:00Z"),
      paymentMethodLabel: "Cash on delivery",
      items: [
        {
          id: "i1",
          productName: "Linen Overshirt",
          variantLabel: "Black / M",
          quantity: 1,
          lineTotalPaisa: 450_000,
        },
      ],
      subtotalPaisa: 450_000,
      shippingPaisa: 10_000,
      totalPaisa: 460_000,
      vatPaisa: 52_920,
      address: {
        fullName: "Asha Shrestha",
        street: "Jhamsikhel Road",
        city: "Lalitpur",
        district: "Lalitpur",
        province: "Bagmati",
        phone: "9812345678",
      },
    });
    expect(email.subject).toBe("Order VZ-260928-0042 confirmed");
    expect(email.text).toContain("Linen Overshirt");
    expect(email.text).toContain("Rs 4,600");
    expect(email.html).toContain("28 Sep 2026");
    // Order emails carry a Reply-To (sales@), so they invite replies; same frame as every email.
    expect(email.text).toContain("Questions? Reply to this email");
    expect(email.html).toContain('href="https://virzeen.com/privacy"');
    expect(email.html).toContain("brand/email-wordmark.png");
    expect(email.html).not.toMatch(/[0-9]rem/);
  });
});
