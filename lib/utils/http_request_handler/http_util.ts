import { Platform } from './../../platform_support';


export const __platforms: Platform[] = ['__universal__'];

export const isSuccessStatusCode = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 400;
}
