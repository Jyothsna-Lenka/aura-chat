// An error with an HTTP status and a machine-readable code. Handled by errorHandler.
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code = 'BAD_REQUEST',
    public details?: unknown,
  ) {
    super(message);
  }
}
