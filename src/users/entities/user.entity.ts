import { GameSessionPlayer } from 'src/game/entities/game-player.entity';
import { Win } from 'src/game/entities/win.entity';
import { Entity, Column, CreateDateColumn, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  wins: number;

  @Column({ nullable: true })
  activeSessionId: number;

  @OneToMany(() => GameSessionPlayer, (player) => player.user)
  sessions: GameSessionPlayer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Win, win => win.user)
  wining: Win[];
}
