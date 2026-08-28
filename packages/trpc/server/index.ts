import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { memberRouter } from "./routes/member/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  member: memberRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
