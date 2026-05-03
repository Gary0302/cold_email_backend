import { google } from "googleapis";

export interface SendGmailInput {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendGmailResult {
  messageId: string;
  threadId?: string;
}

export async function sendGmail(
  accessToken: string,
  input: SendGmailInput,
): Promise<SendGmailResult> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const raw = encodeRfc2822(input);

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  if (!res.data.id) {
    throw new Error("Gmail send returned no message id");
  }
  return {
    messageId: res.data.id,
    threadId: res.data.threadId ?? undefined,
  };
}

function encodeRfc2822({ from, to, subject, body }: SendGmailInput): string {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
  ].join("\r\n");

  const message = `${headers}\r\n\r\n${body}`;
  return Buffer.from(message, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeHeader(value: string): string {
  // RFC 2047 encoded-word for non-ASCII subjects.
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const encoded = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
