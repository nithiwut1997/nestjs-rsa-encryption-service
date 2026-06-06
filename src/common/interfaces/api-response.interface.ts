export interface ApiResponse<T> {
  successful: boolean;
  error_code: string;
  data: T | null;
}

export interface EncryptResponseData {
  data1: string;
  data2: string;
}

export interface DecryptResponseData {
  payload: string;
}
