import type { Contact } from "./types";

interface ApolloSearchInput {
  companyKeyword?: string;
  roles?: string[];
  location?: string;
  headcount?: "1-10" | "11-50" | "51-200" | "200+";
  limit?: number;
}

const HEADCOUNT_MAP: Record<string, string[]> = {
  "1-10": ["1,10"],
  "11-50": ["11,50"],
  "51-200": ["51,200"],
  "200+": ["201,500", "501,1000", "1001,5000"],
};

const MOCK_FALLBACK: Contact[] = [
  {
    id: "mock-1",
    name: "Jane Chen",
    email: "jane@stripe.com",
    title: "CEO",
    company: "Stripe",
    linkedinUrl: "https://linkedin.com/in/janechen",
  },
  {
    id: "mock-2",
    name: "Marcus Lee",
    email: "marcus@retool.com",
    title: "Founder",
    company: "Retool",
    linkedinUrl: "https://linkedin.com/in/marcuslee",
  },
  {
    id: "mock-3",
    name: "Priya Patel",
    email: "priya@vercel.com",
    title: "CTO",
    company: "Vercel",
    linkedinUrl: "https://linkedin.com/in/priyapatel",
  },
  {
    id: "mock-4",
    name: "Sam Rodriguez",
    email: "sam@linear.app",
    title: "Head of Product",
    company: "Linear",
  },
  {
    id: "mock-5",
    name: "Aisha Okafor",
    email: "aisha@warp.dev",
    title: "VP Engineering",
    company: "Warp",
  },
];

export async function searchApolloContacts(
  input: ApolloSearchInput,
): Promise<Contact[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  const limit = input.limit ?? 8;

  if (!apiKey) {
    console.warn("[apollo] APOLLO_API_KEY not set, returning mock contacts");
    return MOCK_FALLBACK.slice(0, limit);
  }

  const body: Record<string, unknown> = {
    page: 1,
    per_page: limit,
  };
  if (input.roles?.length) body.person_titles = input.roles;
  if (input.location) body.person_locations = [input.location];
  if (input.companyKeyword) body.q_organization_keyword_tags = [input.companyKeyword];
  if (input.headcount) {
    body.organization_num_employees_ranges = HEADCOUNT_MAP[input.headcount];
  }

  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[apollo] search failed:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { people?: ApolloPerson[] };
    return (data.people ?? [])
      .filter((p) => p.email)
      .slice(0, limit)
      .map(toContact);
  } catch (err) {
    console.error("[apollo] fetch error:", err);
    return [];
  }
}

interface ApolloPerson {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  linkedin_url?: string;
  organization?: { name?: string };
}

function toContact(p: ApolloPerson): Contact {
  return {
    id: p.id,
    name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
    email: p.email!,
    title: p.title,
    company: p.organization?.name,
    linkedinUrl: p.linkedin_url,
  };
}
