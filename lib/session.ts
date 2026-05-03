import { auth } from "@/auth";

export interface AuthedUser {
  userId: string;
  email?: string | null;
  accessToken?: string;
}

/**
 * Resolve the current user. Falls back to DEV_USER_ID for local dev so the
 * backend works before Brandon's Google OAuth flow is fully wired in.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      email: session.user.email,
      accessToken: session.accessToken,
    };
  }
  const devId = process.env.DEV_USER_ID;
  if (devId) {
    return {
      userId: devId,
      email: process.env.DEV_USER_EMAIL ?? null,
      accessToken: undefined,
    };
  }
  return null;
}
