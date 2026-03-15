import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured — SMS skipped");
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error("SMS send failed:", error);
    return false;
  }
}

export function buildSMSMessages({
  donorName,
  bloodType,
  centreName,
  requiredBy,
  donorStatus,
  lastDonationDate,
  staffNote,
}: {
  donorName: string;
  bloodType: string;
  centreName: string;
  requiredBy: string;
  donorStatus: string;
  lastDonationDate: string | null;
  staffNote: string | null;
}) {
  const donationNote = lastDonationDate
    ? `Your last donation was on ${new Date(lastDonationDate).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })}.`
    : "No previous donation date is on file.";

  const noteText = staffNote ? `Note from staff: ${staffNote}` : "";

  const urgent = `URGENT OUTREACH\nGood day ${donorName}, urgent hospital support needed for ${bloodType} donors at ${centreName}, needed by ${new Date(requiredBy).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })}. You are currently marked as ${donorStatus} to donate. ${donationNote} Please reply in Blood Bridge if you are available.`;

  const reminder = `Hello ${donorName}, we are coordinating a critical request for ${bloodType} at ${centreName} in Jamaica. You are currently marked as ${donorStatus} to donate. ${noteText} Please log in to Blood Bridge to respond.`;

  const followUp = `Blood Bridge update for ${bloodType} needed at ${centreName}. Required by ${new Date(requiredBy).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })}. ${donationNote} Please mark Interested, Booked, or Unavailable in your dashboard so hospital staff can plan safely.`;

  return { urgent, reminder, followUp };
}