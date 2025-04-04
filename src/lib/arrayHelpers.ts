/**
 * Groups an array of items by a key function
 * @param items Array of items to group
 * @param keyFn Function that returns the key to group by for each item
 * @returns Record mapping each key to array of items with that key
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}
