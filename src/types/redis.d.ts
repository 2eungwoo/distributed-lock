import 'ioredis';

declare module 'ioredis' {
  interface Redis {
    releaseLock(key: string, value: string): Promise<number>;
  }
}
