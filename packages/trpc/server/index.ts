import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { memberRouter } from "./routes/member/route";
import { claimsRouter } from "./routes/claims/route";
import { demoRouter } from "./routes/demo/route";
import { employerAuthRouter, employerRouter } from "./routes/employer/route";
import { assistantRouter } from "./routes/assistant/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  member: memberRouter,
  claims: claimsRouter,
  demo: demoRouter,
  employerAuth: employerAuthRouter,
  employer: employerRouter,
  assistant: assistantRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
