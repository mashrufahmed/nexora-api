export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, unknown> | null;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: string[] | null;
  statusCode: number;
  timestamp: string;
  path: string;
}
