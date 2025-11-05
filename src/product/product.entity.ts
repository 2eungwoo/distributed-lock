import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseTimeEntity } from '../common/entities/base-time.entity';

@Entity()
export class Product extends BaseTimeEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ default: 0 }) stock: number;
}
