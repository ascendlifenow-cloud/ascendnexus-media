export interface PublicPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PublicApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown> & { pagination?: PublicPaginationMeta };
  warnings?: string[];
  errors?: string[];
}
