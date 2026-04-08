import pino from "pino";

export const createLogger = (level: string) =>
  pino({
    base: null,
    level,
  });

export type Logger = ReturnType<typeof createLogger>;
