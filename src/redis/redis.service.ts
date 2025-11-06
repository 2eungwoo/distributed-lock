import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

// A simple lock object to hold the lock data
export interface Lock {
  resource: string;
  value: string;
  expiration: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    // Define the Lua script for safe lock release
    this.redis.defineCommand('releaseLock', {
      numberOfKeys: 1,
      lua: `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `,
    });
  }

  public getClient(): Redis {
    return this.redis;
  }

  async checkConnection(): Promise<string> {
    try {
      const result = await this.redis.ping();
      return result; // 'PONG'
    } catch (error) {
      this.logger.error('Redis 연결 실패', error);
      return 'Error connecting to Redis';
    }
  }

  async acquireLock(
    resource: string,
    lockTimeout = 5000, // 5 seconds
    retryTimeout = 4000, // 4 seconds
    retryDelay = 50, // 50 ms
  ): Promise<Lock> {
    const lockValue = randomBytes(16).toString('hex');
    const expiration = Date.now() + lockTimeout;
    const retryUntil = Date.now() + retryTimeout;

    while (Date.now() < retryUntil) {
      const result = await this.redis.set(
        resource,
        lockValue,
        'PX',
        lockTimeout,
        'NX',
      );

      if (result === 'OK') {
        this.logger.debug(`락 획득 성공: ${resource}`);
        return { resource, value: lockValue, expiration };
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    throw new Error(`Failed to acquire lock for resource: ${resource}`);
  }

  async releaseLock(lock: Lock): Promise<void> {
    try {
      const result = await this.redis.releaseLock(lock.resource, lock.value);
      if (result === 1) {
        this.logger.debug(`락 해제 완료: ${lock.resource}`);
      } else {
        // This can happen if the lock expired before we could release it
        this.logger.warn(
          `락 해제 시도 실패 (이미 만료되었거나 소유자가 아님): ${lock.resource}`,
        );
      }
    } catch (error) {
      this.logger.error(`락 해제 실패: ${lock.resource}`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis 연결 종료');
    } catch (error) {
      this.logger.error('Redis 종료 중 오류', error);
    }
  }
}
