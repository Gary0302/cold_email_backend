import { tool } from "ai";
import { z } from "zod";
import { createDraft, listDrafts, updateDraft } from "../kv";
import type { Draft } from "../types";
import { searchApolloContacts } from "../apollo";

export function buildCustomTools(userId: string) {
  return {
    apollo_search_contacts: tool({
      description:
        "Search Apollo.io for verified contacts (founders, execs, ICs) at startups matching the given filters. Returns up to `limit` results with name, email, title, company, and a stable contactId. Call this BEFORE drafting emails.",
      inputSchema: z.object({
        companyKeyword: z
          .string()
          .optional()
          .describe("e.g. 'fintech', 'AI infra', 'developer tools'"),
        roles: z
          .array(z.string())
          .optional()
          .describe("Job titles to match, e.g. ['CEO','Founder','CTO']"),
        location: z.string().optional().describe("City or 'remote'"),
        headcount: z
          .enum(["1-10", "11-50", "51-200", "200+"])
          .optional(),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (input) => {
        const contacts = await searchApolloContacts(input);
        return { count: contacts.length, contacts };
      },
    }),

    draft_cold_email: tool({
      description:
        "Persist a cold email draft for one contact. Call this once per (contact, angle). The draft is saved with status='pending' and immediately appears in the user's swipe deck.",
      inputSchema: z.object({
        contactId: z
          .string()
          .describe("Stable id for this contact (Apollo person id or any unique string)."),
        contactName: z.string(),
        contactEmail: z.string().email(),
        contactCompany: z.string().optional(),
        contactTitle: z.string().optional(),
        subject: z.string().max(80),
        body: z.string().describe("Plain-text email body. No HTML, no signature."),
        angle: z
          .enum(["personal_pitch", "mutual_interest", "value_first", "other"])
          .describe("Which angle this draft uses."),
      }),
      execute: async (input) => {
        const draft: Draft = {
          id: crypto.randomUUID(),
          userId,
          contactId: input.contactId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactCompany: input.contactCompany,
          contactTitle: input.contactTitle,
          subject: input.subject,
          body: input.body,
          angle: input.angle,
          status: "pending",
          createdAt: Date.now(),
        };
        await createDraft(draft);
        return { draftId: draft.id, ok: true };
      },
    }),

    list_pending_drafts: tool({
      description:
        "Return drafts the user swiped left on (status='queued_for_edit'). Use this in review mode to suggest improvements.",
      inputSchema: z.object({}),
      execute: async () => {
        const drafts = await listDrafts(userId, "queued_for_edit");
        return {
          count: drafts.length,
          drafts: drafts.map((d) => ({
            id: d.id,
            contactName: d.contactName,
            contactCompany: d.contactCompany,
            subject: d.subject,
            body: d.body,
            angle: d.angle,
          })),
        };
      },
    }),

    update_draft: tool({
      description:
        "Overwrite an existing draft's subject/body (used when the user accepts a rewrite suggestion in review mode).",
      inputSchema: z.object({
        draftId: z.string(),
        subject: z.string().max(80).optional(),
        body: z.string().optional(),
      }),
      execute: async ({ draftId, subject, body }) => {
        const updated = await updateDraft(draftId, {
          ...(subject !== undefined && { subject }),
          ...(body !== undefined && { body }),
        });
        return updated
          ? { ok: true, draftId }
          : { ok: false, error: "draft_not_found" };
      },
    }),
  };
}
