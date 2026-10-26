export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sin permiso") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}
