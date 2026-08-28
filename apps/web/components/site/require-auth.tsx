"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import type { RouterOutputs } from "@repo/trpc/client";

type Member = NonNullable<RouterOutputs["auth"]["me"]["member"]>;

/**
 * Wraps a protected page's content. Redirects to /login if signed out;
 * otherwise hands the resolved member to `children`. Every member-scoped
 * screen uses this instead of re-implementing the same redirect-on-null
 * effect (Dashboard, Passbook, Claims, ...).
 */
export function RequireAuth({ children }: { children: (member: Member) => React.ReactNode }) {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();

  useEffect(() => {
    if (me.isSuccess && !me.data.member) {
      router.push("/login");
    }
  }, [me.isSuccess, me.data, router]);

  if (me.isLoading || !me.data?.member) {
    return null;
  }

  return <>{children(me.data.member)}</>;
}
