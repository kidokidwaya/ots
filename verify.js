// Checks a Paystack payment on the server before the site says "thank you".
// The secret key lives in Netlify (Site configuration > Environment variables > PAYSTACK_SECRET_KEY),
// never in the web page.
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let reference = "";
  try {
    reference = String(JSON.parse(event.body || "{}").reference || "");
  } catch (e) {
    return json(400, { error: "Bad request" });
  }
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) return json(400, { error: "Invalid reference" });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return json(500, { error: "Payment checking is not set up yet" });

  try {
    const res = await fetch(
      "https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference),
      { headers: { Authorization: "Bearer " + secret } }
    );
    const out = await res.json();
    if (!res.ok || !out.status || !out.data) return json(502, { error: "Could not check the payment" });
    const d = out.data;
    return json(200, {
      paid: d.status === "success",
      amount: d.amount / 100,
      currency: d.currency,
      reference: d.reference,
    });
  } catch (e) {
    return json(502, { error: "Could not reach Paystack" });
  }
};
