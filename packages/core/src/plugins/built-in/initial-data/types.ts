export interface InitialDataReadOptions<TData = unknown> {
  /** Data to use immediately on first mount (before fetch completes) */
  initialData?: TData;

  /** Refetch fresh data after showing initial data. Default: false */
  refetchOnInitialData?: boolean;
}

export type InitialDataInfiniteReadOptions<TData = unknown> =
  InitialDataReadOptions<TData>;

export interface InitialDataReadResult {
  /** True if currently showing initial data (not yet fetched from server) */
  isInitialData: boolean;
}

export type InitialDataWriteOptions = object;
export type InitialDataWriteResult = object;
