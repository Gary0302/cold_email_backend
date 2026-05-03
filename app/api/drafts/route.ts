import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/session";
import { listDrafts } from "@/lib/kv";
import type { DraftStatus } from "@/lib/types";

const VALID_STATUSES: DraftStatus[] = ["pending", "queued_for_edit", "sent"];

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (VALID_STATUSES as string[]).includes(statusParam)
      ? (statusParam as DraftStatus)
      : undefined;

  const drafts = await listDrafts(user.userId, status);
  return NextResponse.json({ drafts });
}
