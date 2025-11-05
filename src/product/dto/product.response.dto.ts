import { Product } from '../product.entity';

export class ProductResponseDto {
  id: number;
  name: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;

  static from(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      stock: product.stock,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
