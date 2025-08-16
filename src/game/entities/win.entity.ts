import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';

@Entity()
export class Win {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.wining, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) 
  user: User;

  @CreateDateColumn()
  createdAt: Date; 

  @UpdateDateColumn()
  updatedAt: Date;
}
