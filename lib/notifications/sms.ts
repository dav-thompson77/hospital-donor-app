export interface SmsSendResult {
  ok: boolean;
  error?: string;
}

interface SmsPayload {
  to: string;
  body: string;
}

export async function sendSmsMessage(payload: SmsPayload): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      ok: false,
      error:
        "SMS provider credentials are missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).",
    };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: payload.to,
      From: fromNumber,
      Body: payload.body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: `Twilio SMS failed (${response.status}): ${errorText}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown SMS provider error",
    };
  }
}
