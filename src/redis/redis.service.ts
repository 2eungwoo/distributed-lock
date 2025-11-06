/* eslint-disable */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly clients: Redis[];
  private readonly redlock: Redlock;

  constructor() {
    // docker-compose.yml에 정의된 3개의 Redis 서비스에 연결합
    this.clients = [
      new Redis({ host: 'redis1', port: 6379 }),
      new Redis({ host: 'redis2', port: 6379 }),
      new Redis({ host: 'redis3', port: 6379 }),
    ];

    this.redlock = new Redlock(this.clients, {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
    });

    this.redlock.on('clientError', (err) => {
      this.logger.error('A redis error has occurred:', err);
    });
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

  async acquireLock(resource: string, duration = 5000): Promise<Lock> {
    try {
      const lock = await this.redlock.acquire([resource], duration);
      this.logger.debug(`락 획득 성공: ${resource}`);
      return lock;
    } catch (error) {
      this.logger.error(`락 획득 실패: ${resource}`, error);
      // It is important to know that if a lock could not be acquired, an error will be thrown.
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }
  }

  async releaseLock(lock: Lock): Promise<void> {
    try {
      await lock.release();
      this.logger.debug(`락 해제 완료: ${lock.resource}`);
    } catch (error) {
      this.logger.error(`락 해제 실패: ${lock.resource}`, error);
      // This error is thrown if the lock could not be released.
      throw error;
    }
  }

  async onModuleDestroy() {
    // 모든 Redis 클라이언트 연결을 종료합니다.
    await Promise.all(this.clients.map((client) => client.quit()));
    this.logger.log('All Redis connections closed.');
  }
}
