import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Game } from './game.entity';
import { User } from 'src/users/entities/user.entity';

@Entity()
@Unique(['sessionId', 'userId'])
export class GameSessionPlayer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sessionId: string;

    @ManyToOne(() => Game, session => session.players, { onDelete: 'CASCADE' })
    @JoinColumn()
    session: Game;

    @Column()
    userId: string;

    @ManyToOne(() => User, user => user.sessions, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn()
    user: User;

    @Column()
    chosenNumber: number;

    @Column()
    joinedAt: Date;

    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
}
