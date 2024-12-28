function createMapIdToRestObj<
  T extends Record<string, string>,
  K extends keyof T,
>(data: T[], idKey: K) {
  const map = new Map<string, Omit<T, K>>();
  data.forEach((entry) => {
    const id = entry[idKey];
    if (id) {
      const { [idKey]: _, ...rest } = entry;
      map.set(id, rest);
    }
  });
  return map;
}

export default createMapIdToRestObj;
