import { jsonrepair } from "jsonrepair";

/**
 * Parse JSON from model output: strict parse first, then jsonrepair + parse.
 * Callers may chain additional heuristics after this throws.
 */
export function tryParseJsonWithRepair(input: string): unknown {
  const s = input.trim();
  if (!s) {
    throw new SyntaxError("Empty JSON input");
  }
  try {
    return JSON.parse(s);
  } catch {
    // structural fixes: trailing commas, unquoted keys, etc.
  }
  const repaired = jsonrepair(s);
  return JSON.parse(repaired);
}
