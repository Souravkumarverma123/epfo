import { eq, establishments } from "@repo/database";
import { BaseRepository } from "./base-repository";
import type { Executor } from "../executor";

export type EstablishmentRow = typeof establishments.$inferSelect;

export class EstablishmentRepository extends BaseRepository {
  constructor(executor: Executor) {
    super(executor);
  }

  async findById(id: string): Promise<EstablishmentRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(establishments)
      .where(eq(establishments.id, id))
      .limit(1);
    return row;
  }

  /** Establishment code is the employer login handle — callers should
   *  normalize (strip spaces) before calling this. */
  async findByCode(establishmentCode: string): Promise<EstablishmentRow | undefined> {
    const [row] = await this.executor
      .select()
      .from(establishments)
      .where(eq(establishments.establishmentCode, establishmentCode))
      .limit(1);
    return row;
  }
}
