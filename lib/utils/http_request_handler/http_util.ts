
export const __supportedPlatforms = ['__universal__'] as const;

export const isSuccessStatusCode = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 400;
}
