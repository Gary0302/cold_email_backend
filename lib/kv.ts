import { kv } from "@vercel/kv";
import type { Draft, DraftStatus } from "./types";

const draftKey = (id: string) => `draft:${id}`;
const userDraftsKey = (userId: string) => `user:${userId}:drafts`;

export async function createDraft(d: Draft): Promise<void> {
  await kv.set(draftKey(d.id), d);
  await kv.zadd(userDraftsKey(d.userId), { score: d.createdAt, member: d.id });
}

export async function getDraft(id: string): Promise<Draft | null> {
  return (await kv.get<Draft>(draftKey(id))) ?? null;
}

export async function updateDraft(
  id: string,
  patch: Partial<Omit<Draft, "id" | "userId" | "createdAt">>,
): Promise<Draft | null> {
  const existing = await getDraft(id);
  if (!existing) return null;
  const next: Draft = { ...existing, ...patch };
  await kv.set(draftKey(id), next);
  return next;
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  await kv.del(draftKey(id));
  await kv.zrem(userDraftsKey(userId), id);
}

export async function listDrafts(
  userId: string,
  status?: DraftStatus,
): Promise<Draft[]> {
  const ids = await kv.zrange<string[]>(userDraftsKey(userId), 0, -1);
  if (!ids.length) return [];
  const drafts = await Promise.all(ids.map((id) => getDraft(id)));
  const filtered = drafts.filter((d): d is Draft => d !== null);
  return status ? filtered.filter((d) => d.status === status) : filtered;
}
