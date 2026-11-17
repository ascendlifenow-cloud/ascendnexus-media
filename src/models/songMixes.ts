export const songMixes = [
  { key: "nexus-01", name: "Nexus Mix 01" },
  { key: "nexus-02", name: "Nexus Mix 02" },
  { key: "nexus-03", name: "Nexus Mix 03" },
] as const;
export type SongMixKey = typeof songMixes[number]["key"];
export const validSongMix = (value: unknown): value is SongMixKey => songMixes.some(mix => mix.key === value);

// A stable default keeps existing releases organized without changing publication or access.
export function songMixKey(releaseId: string, selected?: unknown): SongMixKey {
  if (validSongMix(selected)) return selected;
  let hash = 0;
  for (const char of releaseId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return songMixes[hash % songMixes.length].key;
}
export function groupSongMixes<T>(items: readonly T[], identity: (item: T) => string, selection: (item: T) => unknown) {
  const groups = songMixes.map(mix => ({ ...mix, items: [] as T[] }));
  const seen = new Set<string>();
  for (const item of items) {
    const id = identity(item);
    if (seen.has(id)) continue;
    seen.add(id);
    groups.find(mix => mix.key === songMixKey(id, selection(item)))!.items.push(item);
  }
  return groups;
}
