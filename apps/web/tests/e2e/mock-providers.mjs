// Fake eSewa + Khalti for end-to-end tests (testing-strategy.md §4: provider HTTP is always mocked).
// Implements just enough of each API for the checkout journeys. Never used outside tests.
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PROVIDERS_PORT ?? 4010);
const ESEWA_SECRET = process.env.ESEWA_SECRET_KEY ?? "8gBm/:&EnhH.1/q";
const KHALTI_KEY = process.env.KHALTI_SECRET_KEY ?? "test_secret_key";

const esewa = new Map(); // transaction_uuid → { status, total_amount }
const khalti = new Map(); // pidx → { amount, returnUrl, status }

const sign = (message) => createHmac("sha256", ESEWA_SECRET).update(message).digest("base64");
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
  });
const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const redirect = (res, location) => {
  res.writeHead(303, { Location: location });
  res.end();
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // eSewa ePay v2 form: "pay" immediately and redirect to success_url with signed data.
  if (req.method === "POST" && url.pathname === "/api/epay/main/v2/form") {
    const fields = Object.fromEntries(new URLSearchParams(await readBody(req)));
    const expected = sign(
      `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${fields.product_code}`,
    );
    if (expected !== fields.signature) return json(res, 400, { error: "invalid signature" });
    if (url.searchParams.get("cancel") === "1") return redirect(res, fields.failure_url);
    esewa.set(fields.transaction_uuid, { status: "COMPLETE", total_amount: fields.total_amount });
    const payload = {
      transaction_code: "MOCK" + randomBytes(3).toString("hex").toUpperCase(),
      status: "COMPLETE",
      total_amount: fields.total_amount,
      transaction_uuid: fields.transaction_uuid,
      product_code: fields.product_code,
      signed_field_names:
        "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    };
    payload.signature = sign(
      payload.signed_field_names
        .split(",")
        .map((name) => `${name}=${payload[name]}`)
        .join(","),
    );
    return redirect(
      res,
      `${fields.success_url}?data=${Buffer.from(JSON.stringify(payload)).toString("base64")}`,
    );
  }

  // eSewa status check.
  if (req.method === "GET" && url.pathname === "/api/epay/transaction/status/") {
    const uuid = url.searchParams.get("transaction_uuid") ?? "";
    const tx = esewa.get(uuid);
    return json(res, 200, {
      product_code: url.searchParams.get("product_code"),
      transaction_uuid: uuid,
      total_amount: Number(tx?.total_amount ?? url.searchParams.get("total_amount")),
      status: tx?.status ?? "NOT_FOUND",
      ref_id: tx ? "MOCKREF" : null,
    });
  }

  // Khalti KPG-2.
  if (url.pathname.startsWith("/khalti/api/v2/")) {
    if (req.headers.authorization !== `Key ${KHALTI_KEY}`)
      return json(res, 401, { detail: "Invalid token." });
    const body = JSON.parse((await readBody(req)) || "{}");
    if (url.pathname.endsWith("/epayment/initiate/")) {
      const pidx = randomBytes(11).toString("hex");
      khalti.set(pidx, { amount: body.amount, returnUrl: body.return_url, status: "Initiated" });
      return json(res, 200, {
        pidx,
        payment_url: `http://localhost:${PORT}/khalti/pay?pidx=${pidx}`,
        expires_in: 3600,
      });
    }
    if (url.pathname.endsWith("/epayment/lookup/")) {
      const tx = khalti.get(body.pidx);
      if (!tx) return json(res, 404, { detail: "Not found." });
      return json(res, 200, {
        pidx: body.pidx,
        total_amount: tx.amount,
        status: tx.status,
        transaction_id: "MOCKTXN",
      });
    }
  }

  // Khalti hosted payment page: pay (or cancel with ?cancel=1) and return to the merchant.
  if (req.method === "GET" && url.pathname === "/khalti/pay") {
    const pidx = url.searchParams.get("pidx") ?? "";
    const tx = khalti.get(pidx);
    if (!tx) return json(res, 404, { detail: "Not found." });
    tx.status = url.searchParams.get("cancel") === "1" ? "User canceled" : "Completed";
    return redirect(
      res,
      `${tx.returnUrl}?pidx=${pidx}&status=${encodeURIComponent(tx.status)}&purchase_order_id=x`,
    );
  }

  if (url.pathname === "/health") return json(res, 200, { ok: true });
  json(res, 404, { error: "not found" });
}).listen(PORT, () => process.stdout.write(`mock providers on :${PORT}\n`));
