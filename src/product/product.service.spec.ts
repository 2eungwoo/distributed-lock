import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { Product } from './product.entity';
import { RedisService } from '../redis/redis.service';

describe('ProductService', () => {
  let service: ProductService;

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    clear: jest.fn(),
  };

  const mockRedisService = {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deductStock with lock', () => {
    it('분산 락을 사용하여 재고를 순차적으로 올바르게 차감', async () => {
      // given
      const initialStock = 100;
      const productInDb = { id: 1, name: 'Test Product', stock: initialStock };

      mockProductRepository.findOne.mockImplementation(() =>
        Promise.resolve({ ...productInDb }),
      );
      mockProductRepository.save.mockImplementation((product: Product) => {
        productInDb.stock = product.stock;
        return Promise.resolve(product);
      });

      // 락 획득 및 해제 모의 처리
      const mockLock = { release: jest.fn().mockResolvedValue(undefined) };
      mockRedisService.acquireLock.mockResolvedValue(mockLock);

      // when
      // 락이 순차적 실행을 보장하므로, for-loop로 동시성 없는 환경을 모의
      for (let i = 0; i < 100; i++) {
        await service.deductStock(1, 1);
      }

      // then
      expect(productInDb.stock).toBe(0);
      expect(mockRedisService.acquireLock).toHaveBeenCalledTimes(100);
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(100);
    });
  });

  describe('clearProducts', () => {
    it('should call the clear method on the product repository', async () => {
      // when
      await service.clearProducts();

      // then
      expect(mockProductRepository.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetProducts', () => {
    it('should clear all products and create a new one', async () => {
      // given
      const newProduct = { id: 1, name: 'Test Product', stock: 100 };
      mockProductRepository.create.mockReturnValue(newProduct);
      mockProductRepository.save.mockResolvedValue(newProduct);

      // when
      const result = await service.resetProducts();

      // then
      expect(mockProductRepository.clear).toHaveBeenCalledTimes(1);
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'Test Product',
        stock: 100,
      });
      expect(mockProductRepository.save).toHaveBeenCalledWith(newProduct);
      expect(result).toEqual(newProduct);
    });
  });
});
