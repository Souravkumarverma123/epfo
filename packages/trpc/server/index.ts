import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { memberRouter } from "./routes/member/route";
import { claimsRouter } from "./routes/claims/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  member: memberRouter,
  claims: claimsRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
