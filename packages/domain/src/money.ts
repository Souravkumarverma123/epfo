/**
 * Money (PRD §12 amendment: pin the representation).
 *
 * Every amount in this system is an integer number of paise, as a bigint.
 * There are no floats and no decimal strings in the financial path. Rupees
 * only exist at the very edge of the UI, produced once by `formatINR`.
 *
 * Why bigint and not number: 1 crore rupees is 10_000_000_00 paise, well
 * within Number.MAX_SAFE_INTEGER today, but silent precision loss is exactly
 * the failure mode this whole project exists to prevent (PRD §4). bigint
 * makes the ceiling explicit instead of quietly assumed.
 */

export type Paise = bigint;

export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) throw new Error(`Not a finite rupee amount: ${rupees}`);
  // Round at the paise boundary before converting, so 50000.005 doesn't
  // become an off-by-one paise through float rounding.
  return BigInt(Math.round(rupees * 100));
}

export function formatINR(paise: Paise): string {
  const rupees = paise / 100n;
  const remainderPaise = paise % 100n < 0n ? -(paise % 100n) : paise % 100n;
  const sign = paise < 0n ? "-" : "";
  const absRupees = rupees < 0n ? -rupees : rupees;
  return `${sign}₹${groupIndian(absRupees.toString())}.${remainderPaise.toString().padStart(2, "0")}`;
}

/** Indian digit grouping: 1,23,45,678 rather than 12,345,678. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${last3}`;
}

/**
 * A `Paise` value serialized for the wire. bigint cannot cross JSON
 * (`JSON.stringify(5000000n)` throws), and REST consumers are external
 * government systems, so the interoperable choice is a decimal string, not
 * superjson. Parse back with `parsePaiseWire`.
 */
export type PaiseWire = string;

export function paiseToWire(paise: Paise): PaiseWire {
  return paise.toString();
}

export function parsePaiseWire(wire: PaiseWire): Paise {
  if (!/^-?\d+$/.test(wire)) throw new Error(`Not an integer paise string: ${wire}`);
  return BigInt(wire);
}
