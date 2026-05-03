// server component — reads auth session and renders the client app shell
import { auth } from "@/auth";
import { ColdReachApp } from "@/components/cold-reach-app";

export default async function Page() {
  const session = await auth();
  const isSignedIn = !!session?.user?.id;
  return <ColdReachApp isSignedIn={isSignedIn} />;
}
