import { DataSource } from 'typeorm';

import * as dotenv from 'dotenv';
import { User } from 'src/users/entities/user.entity';
import { Game } from 'src/game/entities/game.entity';
import { GameSessionPlayer } from 'src/game/entities/game-player.entity';
import { GameSessionQueue } from 'src/game/entities/game-player-queue.entity';
import { Win } from 'src/game/entities/win.entity';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DB_CONNECTION_URL,
  synchronize: false, // Only for migrations
  entities: [User, Game, Win, GameSessionPlayer, GameSessionQueue],
  migrations: ['src/database/migrations/*.ts'],
});
