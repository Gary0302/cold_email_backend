import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@/auth";
import { COLD_EMAIL_SYSTEM_PROMPT } from "@/lib/agent/prompts";
import { buildCustomTools } from "@/lib/agent/tools";
import { getApolloMCPTools } from "@/lib/agent/mcp";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? process.env.DEV_USER_ID;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const apolloTools = await getApolloMCPTools();
  const customTools = buildCustomTools(userId);

  const result = streamText({
    model: "anthropic/claude-opus-4.6",
    system: COLD_EMAIL_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { ...apolloTools, ...customTools },
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
