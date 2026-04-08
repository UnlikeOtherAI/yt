import pino from "pino";

export const createLogger = (level: string) =>
  pino({
    level,
    base: undefined
  });

export type Logger = ReturnType<typeof createLogger>;
