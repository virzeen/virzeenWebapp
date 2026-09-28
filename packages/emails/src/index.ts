import { render } from "@react-email/components";
import { createElement } from "react";
import {
  AdminAlertEmail,
  OrderCancelledEmail,
  OrderConfirmationEmail,
  OrderShippedEmail,
  type AdminAlertEmailData,
  type OrderCancelledEmailData,
  type OrderEmailData,
  type OrderShippedEmailData,
} from "./templates/order";
import { OtpEmail } from "./templates/otp";

export type { AdminAlertEmailData, OrderCancelledEmailData, OrderEmailData, OrderShippedEmailData };
export { formatPaisa } from "./money";
export { EMAIL_WORDMARK_PATH } from "./templates/layout";

/** A rendered email: every email has an HTML body and a plain-text fallback (backend-policies.md §9). */
export type RenderedEmail = { subject: string; html: string; text: string };

// Headings keep their sentence case in plain text (html-to-text shouts them in capitals by default).
const htmlToTextOptions = { selectors: [{ selector: "h1", options: { uppercase: false } }] };

async function renderBoth(subject: string, element: React.ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true, htmlToTextOptions }),
  ]);
  return { subject, html, text };
}

export function renderOtpEmail(input: { otp: string; siteUrl: string }) {
  return renderBoth(`${input.otp} is your Virzeen sign-in code`, createElement(OtpEmail, input));
}

export function renderOrderConfirmationEmail(order: OrderEmailData) {
  return renderBoth(`Order ${order.orderNumber} confirmed`, createElement(OrderConfirmationEmail, { order }));
}

export function renderOrderShippedEmail(order: OrderShippedEmailData) {
  return renderBoth(`Order ${order.orderNumber} is on its way`, createElement(OrderShippedEmail, { order }));
}

export function renderOrderCancelledEmail(order: OrderCancelledEmailData) {
  return renderBoth(
    `Order ${order.orderNumber} was cancelled`,
    createElement(OrderCancelledEmail, { order }),
  );
}

export function renderAdminAlertEmail(alert: AdminAlertEmailData) {
  return renderBoth(`[Virzeen admin] ${alert.title}`, createElement(AdminAlertEmail, { alert }));
}
