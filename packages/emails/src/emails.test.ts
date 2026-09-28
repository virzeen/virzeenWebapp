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
    expect(email.html).not.toMatch(/class="/); // Tailwind classes are inlined for email clients
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
  });
});
