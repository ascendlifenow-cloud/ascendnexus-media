process.env.FEATURE_CONTACT_ENABLED ??= "true";
process.env.NEWSLETTER_ENABLED ??= "true";

const { createMediaApiServer } = await import("../server/index.ts");
const { jsonDatabase } = await import("../server/services/media/JsonDatabase.ts");
const { publicFormTokenService } = await import("../server/services/forms/PublicFormTokenService.ts");

const server = createMediaApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

const post = async (path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => undefined);
  return { response, json };
};

const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const json = await response.json().catch(() => undefined);
  return { response, json };
};

const assertSafe = (payload, label) => {
  const text = JSON.stringify(payload);
  for (const unsafe of ["confirmationTokenHash", "unsubscribeTokenHash", "tokenHash", "smtpPassword", "EMAIL_API_KEY", "password", "rawToken"]) {
    if (text.includes(unsafe)) throw new Error(`${label} exposed ${unsafe}`);
  }
};

try {
  const contactAvailability = await get("/api/public/contact/availability");
  if (!contactAvailability.response.ok || !contactAvailability.json?.success) throw new Error("Contact availability failed.");

  const contact = await post("/api/public/contact", {
    name: "Test Visitor",
    email: `contact-${Date.now()}@example.com`,
    subject: "Verification",
    message: "This is a controlled contact form verification message.",
    consent: { consentProvided: true },
    idempotencyToken: `forms-verify-contact-${Date.now()}`,
  });
  if (!contact.response.ok || !contact.json?.data?.submissionReference) throw new Error(`Contact submit failed: ${JSON.stringify(contact.json)}`);
  assertSafe(contact.json, "contact response");

  const invalidContact = await post("/api/public/contact", { name: "A", email: "bad", message: "short", consent: { consentProvided: false } });
  if (invalidContact.response.status < 400) throw new Error("Invalid contact submission was accepted.");

  const spamContact = await post("/api/public/contact", {
    name: "Bot Visitor",
    email: "bot@example.com",
    message: "This is long enough but has a honeypot.",
    website: "https://spam.example",
    consent: { consentProvided: true },
  });
  if (spamContact.response.status < 400) throw new Error("Honeypot spam submission was accepted.");

  const newsletterAvailability = await get("/api/public/newsletter/availability");
  if (!newsletterAvailability.response.ok || !newsletterAvailability.json?.success) throw new Error("Newsletter availability failed.");

  const newsletter = await post("/api/public/newsletter/subscribe", {
    email: `newsletter-${Date.now()}@example.com`,
    displayName: "Newsletter Test",
    consent: { consentProvided: true },
    idempotencyToken: `forms-verify-newsletter-${Date.now()}`,
  });
  if (!newsletter.response.ok || !newsletter.json?.data?.success) throw new Error(`Newsletter subscribe failed: ${JSON.stringify(newsletter.json)}`);
  assertSafe(newsletter.json, "newsletter response");

  const refreshed = await jsonDatabase.read();
  const latestSubscription = refreshed.newsletterSubscriptions.at(-1);
  const token = latestSubscription ? (await publicFormTokenService.createToken("newsletter_confirmation", latestSubscription.subscriptionId, 60_000)).token : undefined;
  if (token) {
    const confirm = await post("/api/public/newsletter/confirm", { token });
    if (!confirm.response.ok || !confirm.json?.data?.success) throw new Error(`Newsletter confirm failed: ${JSON.stringify(confirm.json)}`);
    const reuse = await post("/api/public/newsletter/confirm", { token });
    if (!reuse.response.ok || reuse.json?.data?.success) throw new Error("Confirmation token reuse was not rejected safely.");
  }

  const data = await jsonDatabase.read();
  const latestContact = data.contactSubmissions.at(-1);
  const latestNewsletter = data.newsletterSubscriptions.at(-1);
  if (!latestContact?.consent || !latestNewsletter?.consent) throw new Error("Consent was not persisted.");
  if (!data.emailDeliveryRecords.length) throw new Error("Email delivery records were not created.");

  console.log(JSON.stringify({
    success: true,
    contactSubmissions: data.contactSubmissions.length,
    newsletterSubscriptions: data.newsletterSubscriptions.length,
    emailDeliveryRecords: data.emailDeliveryRecords.length,
    invalidContactRejected: true,
    honeypotRejected: true,
    tokenReuseRejected: Boolean(token),
    checkedAt: new Date().toISOString(),
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
