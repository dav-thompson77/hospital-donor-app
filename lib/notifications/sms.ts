export interface SmsSendResult {
  ok: boolean;
  error?: string;
}

interface SmsPayload {
  to: string;
  body: string;
}

function normalizeToE164(raw: string) {
  const compact = raw.replace(/[^\d+]/g, "");

  if (compact.startsWith("+")) {
    const digits = compact.replace(/[^\d]/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }

  const digitsOnly = compact.replace(/[^\d]/g, "");

  // Jamaica/local NANP format handling
  // 8761234567 -> +18761234567
  if (digitsOnly.length === 10 && digitsOnly.startsWith("876")) {
    return `+1${digitsOnly}`;
  }
  // 18761234567 -> +18761234567
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }
  // Fallback: allow generic 8-15 digit numbers
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return null;
}

function shortError(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

export async function sendSmsMessage(payload: SmsPayload): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return {
      ok: false,
      error:
        "SMS credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID).",
    };
  }

  const normalizedTo = normalizeToE164(payload.to);
  if (!normalizedTo) {
    return {
      ok: false,
      error: "Recipient phone number is not in a valid international format.",
    };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({ To: normalizedTo, Body: payload.body });
    if (messagingServiceSid) {
      body.set("MessagingServiceSid", messagingServiceSid);
    } else if (fromNumber) {
      body.set("From", fromNumber);
    }

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
      let errorText = "";
      try {
        const json = (await response.json()) as { message?: string };
        errorText = json.message ?? JSON.stringify(json);
      } catch {
        errorText = await response.text();
      }
      return {
        ok: false,
        error: `Twilio SMS failed (${response.status}): ${shortError(errorText)}`,
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
