/**
 * The `Executor` is what every repository is constructed with: either the
 * module-level `db`, or the `tx` handle Drizzle hands to a transaction
 * callback. Repositories don't know or care which one they got — that's
 * what lets `withTransaction` (see transaction.ts) run a whole graph of
 * services against one atomic transaction just by constructing them with
 * `tx` instead of `db`.
 */

import type { Database } from "@repo/database";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Tx;
