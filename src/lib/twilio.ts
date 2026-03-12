export const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
export const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
export const TWILIO_AUTH =
  "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");

export async function sendSms(
  from: string,
  to: string,
  body: string
): Promise<{ sid: string; status: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: TWILIO_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to send SMS via Twilio");
  }
  return { sid: data.sid, status: data.status };
}

export async function findAvailableNumber(
  areaCode?: string
): Promise<string> {
  const params = new URLSearchParams({ Limit: "1" });
  if (areaCode) params.set("AreaCode", areaCode);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/AvailablePhoneNumbers/US/Local.json?${params}`;
  const res = await fetch(url, { headers: { Authorization: TWILIO_AUTH } });
  const data = await res.json();
  if (!data.available_phone_numbers?.length) {
    throw new Error("No local numbers available" + (areaCode ? ` for area code ${areaCode}` : ""));
  }
  return data.available_phone_numbers[0].phone_number;
}

export async function buyNumber(
  phoneNumber: string
): Promise<{ sid: string; phoneNumber: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: TWILIO_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ PhoneNumber: phoneNumber }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to purchase number from Twilio");
  }
  return { sid: data.sid, phoneNumber: data.phone_number };
}

export async function releaseNumber(twilioSid: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers/${twilioSid}.json`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: TWILIO_AUTH },
  });
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as Record<string, string>).message || "Failed to release number from Twilio");
  }
}

export async function releaseNumberByPhone(phoneNumber: string): Promise<void> {
  // Look up the Twilio SID by phone number
  const params = new URLSearchParams({ PhoneNumber: phoneNumber });
  const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json?${params}`;
  const listRes = await fetch(listUrl, { headers: { Authorization: TWILIO_AUTH } });
  const listData = await listRes.json();
  const sid = listData?.incoming_phone_numbers?.[0]?.sid;
  if (sid) {
    await releaseNumber(sid);
  }
}

export async function updateNumberWebhooks(
  twilioSid: string,
  smsUrl: string
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers/${twilioSid}.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: TWILIO_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ SmsUrl: smsUrl, SmsMethod: "POST" }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to update number webhooks");
  }
}
