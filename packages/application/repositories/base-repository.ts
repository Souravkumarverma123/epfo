import type { Executor } from "../executor";

/**
 * Base class for every repository.
 *
 * Design pattern: Repository. Repositories are the ONLY place in this
 * package that import Drizzle table objects and issue queries — services
 * never touch @repo/database directly. This is PRD §10's "Application →
 * repository interfaces" rule, applied pragmatically: instead of a full
 * hexagonal split (domain defines interfaces, database implements them),
 * repositories live here and depend directly on @repo/database, but nothing
 * above them (services, tRPC routers) is allowed to skip past them.
 *
 * Constructor injection of the executor — rather than importing the shared
 * `db` singleton inside each method — is what makes `withTransaction` work:
 * it constructs the same repository classes with a transaction handle
 * instead of `db`, and every query they run automatically becomes part of
 * that transaction. No repository method needs to know whether it's in one.
 */
export abstract class BaseRepository {
  protected constructor(protected readonly executor: Executor) {}
}
