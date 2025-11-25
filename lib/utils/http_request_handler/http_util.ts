
export const __platforms = ['__universal__'];

export const isSuccessStatusCode = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 400;
}
