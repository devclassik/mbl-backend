import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Game } from './game.entity';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class GameSessionQueue {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sessionId: string;
  
    @ManyToOne(() => Game, (session) => session.queue, { onDelete: 'CASCADE' })
    @JoinColumn()
    session: Game;
  
    @Column()
    userId: string;
  
    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;
  
    @Column({ type: 'int' })
    chosenNumber: number;
  
    @Column({ type: 'int' })
    position: number;
  
    @CreateDateColumn()
    enqueuedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
}
