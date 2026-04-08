export const EXIT_CODE = {
  success: 0,
  runtimeError: 1,
  usageError: 2,
  partialResult: 3,
  upstreamFailure: 4
} as const;

export class AppError extends Error {
  public readonly exitCode: number;

  public readonly details?: unknown;

  public constructor(
    message: string,
    exitCode: number = EXIT_CODE.runtimeError,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.exitCode = exitCode;
    this.details = details;
  }
}
