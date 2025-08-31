
export class ApiError extends Error {
  statusCode: number;
  type: string;
  constructor(message: string, statusCode = 500, type = 'server') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
  }
}
