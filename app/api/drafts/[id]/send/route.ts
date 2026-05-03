import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/session";
import { getDraft, updateDraft } from "@/lib/kv";
import { sendGmail } from "@/lib/gmail";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!user.accessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_gmail_access_token",
        hint: "User must sign in with Google (gmail.send scope) before sending.",
      },
      { status: 400 },
    );
  }
  if (!user.email) {
    return NextResponse.json(
      { ok: false, error: "no_user_email" },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const draft = await getDraft(id);
  if (!draft) return new NextResponse("Not found", { status: 404 });
  if (draft.userId !== user.userId)
    return new NextResponse("Forbidden", { status: 403 });
  if (draft.status === "sent") {
    return NextResponse.json(
      { ok: true, draft, alreadySent: true },
      { status: 200 },
    );
  }

  try {
    const result = await sendGmail(user.accessToken, {
      from: user.email,
      to: draft.contactEmail,
      subject: draft.subject,
      body: draft.body,
    });

    const updated = await updateDraft(id, {
      status: "sent",
      sentAt: Date.now(),
      gmailMessageId: result.messageId,
    });

    return NextResponse.json({
      ok: true,
      draft: updated,
      gmailMessageId: result.messageId,
    });
  } catch (err) {
    console.error("[drafts/send] gmail error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "gmail_send_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
