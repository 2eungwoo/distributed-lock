/* eslint-disable */
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redlock: Redlock;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    // Redlock 인스턴스는 싱글톤처럼 1개만 생성
    this.redlock = new Redlock([this.redis], {
      driftFactor: 0.01, // 시간 보정 계수
      retryCount: 10, // 재시도 횟수
      retryDelay: 200, // 재시도 간격(ms)
      retryJitter: 200, // 랜덤 지연
      automaticExtensionThreshold: 500, // 만료 연장 임계값(ms)
    });

    this.redlock.on('clientError', (err: unknown) => {
      if (err instanceof Error)
        this.logger.error('Redlock client error:', err.message, err.stack);
      else this.logger.error(`Redlock client error: ${String(err)}`);
    });
  }

  // Redis 클라이언트 반환
  public getClient(): Redis {
    return this.redis;
  }

  // Redis 연결 확인용
  async checkConnection(): Promise<string> {
    try {
      const result = await this.redis.ping();
      this.logger.log(`Redis ping: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Redis 연결 실패', error);
      return 'Error connecting to Redis';
    }
  }

  // 락 획득 (Redlock v6 이상 문법)
  async acquireLock(resource: string, duration = 5000): Promise<Lock> {
    try {
      const lock = await this.redlock.acquire([resource], duration);
      this.logger.debug(`락 획득 성공: ${resource}`);
      return lock;
    } catch (error) {
      this.logger.error(`락 획득 실패: ${resource}`, error);
      throw new Error(
        `락 획득 실패 (${resource}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 최신 Redlock using() 문법 — critical section 예시
  async withLock(
    resource: string,
    duration = 5000,
    fn: () => Promise<void>,
  ): Promise<void> {
    await this.redlock.using([resource], duration, async (signal) => {
      this.logger.debug(`락 획득 후 실행: ${resource}`);
      await fn();

      // 필요 시 연장 예시
      if (!signal.aborted) {
        this.logger.verbose(`락 자동 연장: ${resource}`);
      }
    });
  }

  // 락 해제 (LockReleaseError 대응)
  async releaseLock(lock: Lock): Promise<void> {
    try {
      await lock.release();
      this.logger.debug(`락 해제 완료: ${lock.resource}`);
    } catch (error: any) {
      if (error.name === 'LockReleaseError') {
        this.logger.warn(`이미 만료된 락: ${lock.resource}`);
        return;
      }
      this.logger.error(`락 해제 실패: ${lock.resource}`, error);
      throw new Error(`락 해제 실패 (${lock.resource}): ${error.message}`);
    }
  }

  // 서비스 종료 시 연결 해제
  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis 연결 종료');
    } catch (error) {
      this.logger.error('Redis 종료 중 오류', error);
    }
  }
}
