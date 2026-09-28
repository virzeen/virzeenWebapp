"use client";

/**
 * eSewa needs a POSTed form. The server prepared and signed every field; the browser only submits it
 * (payment-policy.md §5.2). The form never contains anything the customer typed.
 */
export function submitProviderForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.hidden = true;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
