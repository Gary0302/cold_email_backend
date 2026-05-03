export type DraftStatus = "pending" | "queued_for_edit" | "sent";

export interface Contact {
  id: string;
  name: string;
  email: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
}

export interface Draft {
  id: string;
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactCompany?: string;
  contactTitle?: string;
  subject: string;
  body: string;
  angle: string;
  status: DraftStatus;
  createdAt: number;
  sentAt?: number;
  gmailMessageId?: string;
}

export interface FilterInput {
  companyKeyword?: string;
  roles?: string[];
  location?: string;
  headcount?: "1-10" | "11-50" | "51-200" | "200+";
  draftsPerContact?: 1 | 2 | 3;
}
