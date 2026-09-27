import type { SettingValue } from '@notation-hero/client';

export type PlayerSettingsJson = Record<string, unknown>;

/** A plain object OR an array: both are walked by key, and an array's keys are its indexes. */
const isContainer = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

/**
 * Dot-path read over the settings JSON. Returns undefined for a path that is not there, and for
 * one that lands on a container rather than a value. An array element is addressed by its index:
 * 'display.padding.0'.
 */
export function readSettingValue(json: PlayerSettingsJson, path: string): SettingValue | undefined {
  let current: unknown = json;
  for (const part of path.split('.')) {
    // Object.hasOwn, not `in`: the settings JSON is DATA, not a JS object to resolve properties
    // on, and `in` also matches the prototype chain (e.g. 'toString', or '__proto__' itself).
    // hasOwn keeps the walk on the tree's own keys only.
    if (!isContainer(current) || !Object.hasOwn(current, part)) return undefined;
    // A false positive for the loop shape alone: this line READS, and a read cannot pollute
    // anything. The hasOwn guard above keeps the walk on the tree's own keys, so an inherited
    // 'toString' is never followed.
    //
    // It does NOT, however, reject a literal '__proto__' — that claim is false, and testable:
    // JSON.parse('{"__proto__":{}}') produces an OWN data property of that name, and
    // Object.hasOwn returns true for it (measured). Reading it is harmless: it yields that data
    // property, not Object.prototype, and the return below admits only a string, number or
    // boolean. The write path's safety is a separate argument — see writeInto.
    current = current[part]; // nosemgrep: prototype-pollution-loop
  }
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? current
    : undefined;
}

function writeInto(container: unknown, parts: readonly string[], value: SettingValue): unknown {
  if (parts.length === 0) return value;
  const [head, ...rest] = parts;
  // An array must STAY an array: spreading it into an object literal would turn [35, 35] into
  // { 0: 35, 1: 35 }, which AlphaTab does not read as a padding at all.
  if (Array.isArray(container)) {
    const copy = [...(container as unknown[])];
    copy[Number(head)] = writeInto(copy[Number(head)], rest, value);
    return copy;
  }
  const base = isContainer(container) ? container : {};
  // Object.hasOwn, same reasoning as readSettingValue: only an OWN key of the tree is a real
  // existing value to recurse into, never something resolved off the prototype chain.
  const existing = Object.hasOwn(base, head) ? base[head] : undefined;
  // What actually makes a hostile `head` of '__proto__' harmless is the COMPUTED KEY below, not
  // the hasOwn above. A computed key in an object literal — like object spread — defines the
  // property with CreateDataProperty, which never invokes the '__proto__' setter, so it lands as
  // an ordinary own key on the new object and Object.prototype is untouched. Assigning through
  // `base.__proto__ = …` or `Object.assign` WOULD invoke that setter; neither is used here, and
  // neither should be introduced. Measured both shapes: Object.prototype stayed clean.
  return { ...base, [head]: writeInto(existing, rest, value) };
}

/**
 * Dot-path write. Immutable: React state holds this object, and mutating it in place would leave
 * the popover showing a stale value while the engine had the new one.
 */
export function writeSettingValue(
  json: PlayerSettingsJson,
  path: string,
  value: SettingValue,
): PlayerSettingsJson {
  return writeInto(json, path.split('.'), value) as PlayerSettingsJson;
}
