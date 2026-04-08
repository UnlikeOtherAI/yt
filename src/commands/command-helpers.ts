import { AppError, EXIT_CODE } from "../errors.js";

export type CommonOptions = {
  json?: boolean;
};

export const parsePositiveInteger = (value: string, name: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${name} must be a positive integer.`, EXIT_CODE.usageError);
  }

  return parsed;
};

export const writeHuman = (message: string) => {
  process.stderr.write(`${message}\n`);
};
