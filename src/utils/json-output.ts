export const printJson = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value, undefined, 2)}\n`);
};
