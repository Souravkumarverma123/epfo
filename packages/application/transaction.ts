/**
 * Transaction boundary helper.
 *
 * PRD §10 amendment: transaction boundaries belong to the application layer —
 * never the domain (which does no I/O at all) and never a tRPC router
 * (which should stay a thin translation of HTTP to a use case call). Every
 * use case in this package that writes more than one row calls this once,
 * at its own top level, and passes the transaction handle down.
 */

import { db } from "@repo/database";
import type { Executor } from "./executor";

export type TransactionCallback<T> = (tx: Executor) => Promise<T>;

/**
 * Run `callback` inside a single Postgres transaction. If `callback` throws,
 * every write it made is rolled back — including any ledger entry, outbox
 * event, or claim transition inserted along the way. This is what makes the
 * transactional outbox pattern (PRD §17) actually hold: the state change and
 * the event that announces it are committed atomically, or neither commits.
 */
export function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  return db.transaction((tx) => callback(tx));
}
