// Minimal Resend API client. Only uses /emails endpoint.
// Docs: https://resend.com/docs/api-reference/emails/send-email

export type ResendSendArgs = {
  from: string; // "Solax Monitor <onboarding@resend.dev>" or your verified domain
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type ResendResult = {
  ok: boolean;
  id?: string;
  error?: string;
  status?: number;
};

export async function sendEmail(args: ResendSendArgs): Promise<ResendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set in Edge Function secrets" };
  }

  const body: Record<string, unknown> = {
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  };
  if (args.replyTo) body.reply_to = args.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.message ?? `HTTP ${res.status}`,
      };
    }

    return { ok: true, id: json.id, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
