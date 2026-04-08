export const toIsoNow = () => new Date().toISOString();

export const toSnapshotDate = (value: Date) => value.toISOString().slice(0, 10);
