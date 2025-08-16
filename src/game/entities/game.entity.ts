import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { GameSessionPlayer } from "./game-player.entity";
import { GameSessionQueue } from "./game-player-queue.entity";


export enum GameStatus {
    WAITING = 'WAITING',
    ACTIVE = 'ACTIVE',
    ENDED = 'ENDED',
}

@Entity()
export class Game {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    createdByUserId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn()
    createdBy: User;

    @Column()
    startTime: Date;

    @Column()
    endTime: Date;

    @Column({ type: 'enum', enum: GameStatus, default: GameStatus.WAITING })
    status: GameStatus;

    @Column({ nullable: true })
    winningNumber: number;

    @Column({ type: 'int' })
    maxPlayers: number;

    @OneToMany(() => GameSessionPlayer, player => player.session, { cascade: true })
    players: GameSessionPlayer[];

    @OneToMany(() => GameSessionQueue, (queue) => queue.session, { cascade: true })
    queue: GameSessionQueue[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    lastActivityTime: Date;
}
