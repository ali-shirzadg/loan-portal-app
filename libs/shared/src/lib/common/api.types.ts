export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Error shape returned by every API error response. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  /** Per-field validation messages, keyed by property name. */
  errors?: Record<string, string[]>;
}
