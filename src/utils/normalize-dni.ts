const normalizeDni = (value: string): string => {
  return value.replace(/[.\-\s]/g, "");
};

export { normalizeDni };
