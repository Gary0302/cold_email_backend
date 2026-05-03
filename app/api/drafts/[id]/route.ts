import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/session";
import { deleteDraft, getDraft, updateDraft } from "@/lib/kv";
import type { DraftStatus } from "@/lib/types";

const ALLOWED_STATUS: DraftStatus[] = ["pending", "queued_for_edit", "sent"];

interface PatchBody {
  subject?: string;
  body?: string;
  status?: DraftStatus;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const existing = await getDraft(id);
  if (!existing) return new NextResponse("Not found", { status: 404 });
  if (existing.userId !== user.userId)
    return new NextResponse("Forbidden", { status: 403 });

  const patch = (await req.json()) as PatchBody;
  if (patch.status && !ALLOWED_STATUS.includes(patch.status)) {
    return new NextResponse("Invalid status", { status: 400 });
  }

  const updated = await updateDraft(id, {
    ...(patch.subject !== undefined && { subject: patch.subject }),
    ...(patch.body !== undefined && { body: patch.body }),
    ...(patch.status !== undefined && { status: patch.status }),
  });

  return NextResponse.json({ draft: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const existing = await getDraft(id);
  if (!existing) return new NextResponse("Not found", { status: 404 });
  if (existing.userId !== user.userId)
    return new NextResponse("Forbidden", { status: 403 });

  await deleteDraft(user.userId, id);
  return NextResponse.json({ ok: true });
}
