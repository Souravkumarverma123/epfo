"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import type { RouterOutputs } from "@repo/trpc/client";

type Establishment = NonNullable<RouterOutputs["employerAuth"]["me"]["establishment"]>;

/** Employer-side mirror of RequireAuth — redirects to /employer/login if
 *  signed out, otherwise hands the resolved establishment to `children`. */
export function RequireEmployerAuth({
  children,
}: {
  children: (establishment: Establishment) => React.ReactNode;
}) {
  const router = useRouter();
  const me = trpc.employerAuth.me.useQuery();

  useEffect(() => {
    if (me.isSuccess && !me.data.establishment) {
      router.push("/employer/login");
    }
  }, [me.isSuccess, me.data, router]);

  if (me.isLoading || !me.data?.establishment) {
    return null;
  }

  return <>{children(me.data.establishment)}</>;
}
