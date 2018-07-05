export class PassportError extends Error {
  public code
  public statusCode

  constructor(code, message, statusCode?) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}
