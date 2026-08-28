import { dependencyState, eq } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type DependencyStateRow = typeof dependencyState.$inferSelect;
export type DependencyMode = "UP" | "DOWN" | "SLOW" | "TIMEOUT";

/**
 * Failure-injection switches for the live demo (PRD §40). This is the one
 * table in the schema that exists purely for the prototype — in a real
 * deployment it would either not exist or would back an actual circuit
 * breaker, not a manual toggle.
 */
export class DependencyRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  /** Defaults to UP when no row exists yet — a dependency nobody has
   *  touched is assumed healthy, not broken. */
  async getMode(dependency: string): Promise<DependencyMode> {
    const [row] = await this.executor
      .select()
      .from(dependencyState)
      .where(eq(dependencyState.dependency, dependency))
      .limit(1);
    return (row?.mode as DependencyMode) ?? "UP";
  }

  async listAll(): Promise<DependencyStateRow[]> {
    return this.executor.select().from(dependencyState);
  }

  async setMode(dependency: string, mode: DependencyMode): Promise<void> {
    await this.executor
      .insert(dependencyState)
      .values({ dependency, mode })
      .onConflictDoUpdate({
        target: dependencyState.dependency,
        set: { mode, updatedAt: new Date() },
      });
  }
}
