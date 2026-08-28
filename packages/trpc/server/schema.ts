import { z } from "zod";

/** GET queries only: an empty query string parses to `undefined`. */
export const zodUndefinedModel = z.undefined().describe("undefined");

/**
 * POST mutations with no meaningful input. A mutation with no request body
 * still reaches Express as `{}` (express.json() parses an empty body to an
 * empty object, not `undefined`) — using zodUndefinedModel here would reject
 * every real request with "expected undefined, received object".
 */
export const zodEmptyInputModel = z.object({}).optional().describe("no input");

export { z };
