# Runbook: Email — sending and receiving

Set up and tested 2026-09-28. Sending runs on **Resend**, receiving on **Cloudflare Email Routing**, and the two partners read and answer everything from one shared Gmail inbox. The shared Gmail address is never shown on the site or written in this repo; it is the verified address under Cloudflare → Email Routing → Destination addresses.

Keep API keys in Railway, Gmail's settings and the password manager only — never in chat, email or the repo. Two-step sign-in on Resend, Cloudflare and the shared Gmail (security-policy.md §10).

## Addresses

| Address                | Used for                                                                                                        | Receives mail?                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `sales@virzeen.com`    | Contact page (orders and sizing); Reply-To on order emails and alerts (`EMAIL_REPLY_TO`). Partners reply as it. | Yes → shared Gmail                    |
| `info@virzeen.com`     | Contact page (collaborations, everything else); security reports (`SECURITY.md`). Partners reply as it.         | Yes → shared Gmail                    |
| `no-reply@virzeen.com` | Website order emails and owner alerts (`EMAIL_FROM`)                                                            | No (no route; mail to it is rejected) |
| `verify@virzeen.com`   | Website sign-in codes (`EMAIL_FROM_AUTH`, specs/email-senders.md)                                               | No                                    |

Any `@virzeen.com` address can send through Resend (the whole domain is verified), but only addresses with a Cloudflare routing rule can receive. To add one (e.g. `security@`), create a routing rule; to send as it from Gmail, add it under "Send mail as".

## How it fits together

- **Website → customers:** the app calls the Resend API (`apps/web/src/server/services/mailer.ts`).
- **Partners → anyone:** Gmail "Send mail as" hands mail to Resend's SMTP server, so it leaves as `info@`/`sales@`, signed for `virzeen.com`.
- **Anyone → `info@`/`sales@`:** Cloudflare Email Routing forwards it to the shared Gmail.
- Resend's own "Enable Receiving" stays **off**: it would need mail records on `virzeen.com` that clash with Email Routing, and it feeds apps, not a Gmail inbox.

## DNS records (Cloudflare → virzeen.com → DNS)

| Added by      | Type                         | Name                | Value                        | Notes                                  |
| ------------- | ---------------------------- | ------------------- | ---------------------------- | -------------------------------------- |
| Resend        | TXT                          | `resend._domainkey` | DKIM key (`p=MIGf…`)         | Signs our mail                         |
| Resend        | CNAME                        | `send`              | `send.forge.rmta.net`        | **DNS only** (grey cloud)              |
| Resend        | CNAME                        | `rsend`             | `rsend-apne1.forge.rmta.net` | **DNS only** (grey cloud)              |
| Owner         | TXT                          | `_dmarc`            | `v=DMARC1; p=none;`          | Resend's Auto configure doesn't add it |
| Email Routing | MX ×3, TXT (SPF), TXT (DKIM) | `virzeen.com`       | Cloudflare's mail servers    | Locked by Email Routing                |

Rules: only **one** `_dmarc` record and only **one** SPF TXT on `virzeen.com`. Never proxy (orange cloud) Resend's records. Don't onboard Cloudflare's separate "Email Sending" product — it adds its own `_dmarc` record. Resend's records sit on `send`, `rsend` and `resend._domainkey`, so they never touch Email Routing's records on `virzeen.com`.

Later, once reports look clean for a few weeks, DMARC can be tightened to `p=quarantine`. To see reports first, turn on Cloudflare → Email → DMARC Management (free); don't point `rua=` at `info@` or reports flood the shared inbox.

## Setting it up again (e.g. a new domain)

### Sending — Resend

1. Resend → Domains → **Add domain** `virzeen.com`. Advanced options: Region **Tokyo (ap-northeast-1)** (nearest to Nepal; can't be changed later), Custom Return-Path `send`, Tracking subdomain empty, click and open tracking **off** (they rewrite links in sign-in and order emails).
2. **Auto configure** (Cloudflare) adds the DKIM and CNAME records. Wait until all three say **Verified**.
3. Add the `_dmarc` record above in Cloudflare.
4. API keys → one per use, each **Sending access** limited to `virzeen.com`:
   - `gmail-smtp` → pasted into Gmail "Send mail as" (both addresses).
   - `website` → Railway `RESEND_API_KEY` (Day 2 of the launch plan).
     Rotating a key means updating everywhere it is used (Gmail: Settings → Accounts and Import → "edit info").

### Receiving — Cloudflare Email Routing

1. Cloudflare → Email Routing → onboard `virzeen.com` and accept its DNS records.
2. **Destination addresses** → add the shared Gmail → click the link in Cloudflare's email.
3. **Routing rules** → `info` → Send to an email → shared Gmail. Same for `sales`. Leave **Catch-all** disabled: mail to any address without a rule is rejected (the sender gets a bounce), so spam to made-up addresses never reaches the inbox.
4. In Gmail, search `to:info@virzeen.com OR to:sales@virzeen.com` → create filter → **Never send it to Spam** (forwarded mail sometimes lands in Spam at first). Add a label per address if useful.

### Replying as `info@` / `sales@` — Gmail "Send mail as"

Receiving must work first: Gmail confirms each address by emailing it.

1. Gmail → Settings → See all settings → **Accounts and Import** → Send mail as → **Add another email address**. Name (e.g. "Virzeen Sales"), the address, keep **Treat as an alias** ticked.
2. SMTP server `smtp.resend.com`, port `587`, username `resend`, password = the `gmail-smtp` key, **Secured connection using TLS**.
3. Enter the confirmation code Gmail sends to the address (it arrives through forwarding).
4. For each address → **edit info** → **Specify a different reply-to address** → the same address. Without it, replies can go to the Gmail address.
5. "When replying to a message" → **Reply from the same address the message was sent to**. (The Android app may ignore this — check the From line before sending.)

**Ends January 2027.** Google is removing "Send as" for outside addresses: new setups may be restricted during Q3–Q4 2026 and existing ones stop in January 2027 (https://support.google.com/mail/answer/17101213). Receiving into Gmail is not affected. Pick a replacement before December 2026 (STATUS.md):

- **Google Workspace** (paid): one user with `info@` and `sales@` as aliases; works on phones too. It takes over the mail records on `virzeen.com`, so it **replaces** Cloudflare Email Routing — plan the switch-over.
- **A desktop mail app** such as Thunderbird: reads the shared Gmail (IMAP stays supported) and sends as `info@`/`sales@` through Resend SMTP. Not on phones.
- **Zoho Mail's free plan**: only if sign-up works from Nepal (it is limited to some regions); web and its own mobile app only.

## Limits

- **Resend free plan:** 100 emails a day, 3,000 a month, and **every recipient counts** (To, CC and BCC each). The day is a UTC day: it resets at 05:45 Nepal time. The website (sign-in codes, order emails, alerts) and the partners' emails as `info@`/`sales@` share this. When it runs out, **every email fails silently** until the reset: the sign-in page still says a code was sent but none arrives, and order emails are skipped. Only the server logs show it ("Failed to run background task" for sign-in codes, "email failed" for order emails) — see STATUS.md. An order is about 2–3 emails, so the cap is roughly 30 orders a day minus the partners' mail. Watch Resend → Usage and move to Pro (about $20/month, 50,000 a month, no daily cap) before launch traffic or campaigns.
- **Resend account health:** bounces under 4%, spam complaints under 0.08%. Use `sales@` for replies and customers who wrote to us — never cold or bulk sales mail through Resend (their acceptable-use policy), because a complaint also hurts delivery of sign-in codes.
- **Cloudflare Email Routing:** free, no daily cap for normal use, 25 MiB per message, 200 routing rules.
- **Gmail:** 15 GB free storage, shared with Drive and Photos.

## Checks

- **Receiving:** from an outside account (Outlook or Yahoo is the stricter test), email `info@` and `sales@`; both arrive in the Inbox. Don't test from the shared Gmail itself — Gmail hides mail you send to yourself (it is only in Sent). Cloudflare → Email Routing → **Activity log** shows each message as Forwarded, Dropped or Rejected.
- **Replying:** send as `sales@` to an outside address, open it → ⋮ → **Show original**: `spf=pass` (for `send.virzeen.com`), `dkim=pass` (for `virzeen.com`) and `dmarc=pass`, and the Gmail address appears nowhere (From, Reply-To, Sender). Reply to it from the outside address and check the reply comes back through forwarding.
- **Website (after deploy):** sign in on the live site — the code arrives from `verify@`. Place a cash-on-delivery order — the confirmation arrives from `no-reply@`, and pressing Reply addresses it to `sales@`; also check the shipped and cancelled emails, because a failed email (sign-in code or order) shows no error to the customer. Resend → Emails lists every message the site sends.
- Optional: send one site email and one partner email to mail-tester.com; aim for 9/10 or better.

## Troubleshooting

- **Forwarded mail in Spam:** the Gmail filter above; check the Activity log. The domain is new, so ask the first customers to mark "Not spam".
- **Resend record won't verify:** its CNAMEs must be DNS only, and nothing else may exist on `send` or `rsend`.
- **An address stopped receiving website mail:** a hard bounce puts it on Resend's suppression list (Resend → Emails → Suppressions); remove it there once the cause is fixed.
- **Mail between `info@` and `sales@` isn't in the Inbox:** both land in the same Gmail, which hides self-sent copies — look in Sent.
- **Gmail "Send mail as" stopped working after a key change:** Settings → Accounts and Import → "edit info" → enter the new key.

## Accounts

- Two-step sign-in on Resend, Cloudflare, the shared Gmail and the domain registrar; registrar lock and auto-renew on (if the domain lapses, all mail stops).
- Invite the second partner as their own member in Resend and Cloudflare rather than sharing one login.
- The shared Gmail address can still leak through the Google sign-in consent screen's support email and the domain's WHOIS record — check both before launch.

## Website settings (Railway → web → Variables)

| Variable            | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| `EMAIL_TRANSPORT`   | `resend` (the production default)                                                      |
| `RESEND_API_KEY`    | the `website` key                                                                      |
| `EMAIL_FROM`        | `Virzeen <no-reply@virzeen.com>`                                                       |
| `EMAIL_FROM_AUTH`   | `Virzeen <verify@virzeen.com>` (sign-in codes; empty = `EMAIL_FROM`)                   |
| `EMAIL_REPLY_TO`    | `sales@virzeen.com` (a bare address; where customers' replies go)                      |
| `OWNER_ALERT_EMAIL` | the shared Gmail (recommended — doesn't depend on forwarding; never shown on the site) |

Type the values without quotes. Admin accounts (`pnpm admin grant`, runbooks/admin-accounts.md): one per partner, each on that partner's **personal** email address with their own authenticator app — never the shared Gmail or a forwarded `info@`/`sales@` address. Then the audit log shows who did what, and one partner's access can be reset or revoked without affecting the other.

Order emails end with "Questions? Reply to this email" — with `EMAIL_REPLY_TO` set, replies to them reach `sales@` (and so the shared Gmail) even though they were sent from `no-reply@`. Sign-in code emails deliberately have no Reply-To: a reply would carry a live code, so it goes to `verify@` and bounces instead of landing in the shared inbox. That's why the code email doesn't say "Reply to this email"; its footer links to "Get help" (`/contact`) instead.
