
export const __supportedPlatforms = ['__universal__'];

export const isSuccessStatusCode = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 400;
}
