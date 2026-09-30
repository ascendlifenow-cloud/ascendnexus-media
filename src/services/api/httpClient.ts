export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "server_error";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HttpClient {
  get<T>(path: string): Promise<ApiResult<T>>;
  post<TPayload, TResult>(path: string, payload: TPayload): Promise<ApiResult<TResult>>;
  patch<TPayload, TResult>(path: string, payload: TPayload): Promise<ApiResult<TResult>>;
  delete<TResult>(path: string): Promise<ApiResult<TResult>>;
}

export const createApiSuccess = <T>(data: T): ApiResult<T> => ({ ok: true, data });

export const createApiError = (code: ApiErrorCode, message: string, status?: number): ApiResult<never> => ({
  ok: false,
  error: { code, message, status },
});

export const httpClient: HttpClient = {
  async get<T>() {
    return createApiError("server_error", "HTTP client is not configured yet.") as ApiResult<T>;
  },
  async post<TPayload, TResult>() {
    return createApiError("server_error", "HTTP client is not configured yet.") as ApiResult<TResult>;
  },
  async patch<TPayload, TResult>() {
    return createApiError("server_error", "HTTP client is not configured yet.") as ApiResult<TResult>;
  },
  async delete<TResult>() {
    return createApiError("server_error", "HTTP client is not configured yet.") as ApiResult<TResult>;
  },
};
