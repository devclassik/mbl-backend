import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { GameSessionPlayer } from './entities/game-player.entity';
import { GameSessionQueue } from './entities/game-player-queue.entity';
import { UsersModule } from 'src/users/users.module';
import { Win } from './entities/win.entity';

@Module({
  controllers: [GameController],
  providers: [GameService],
  imports: [TypeOrmModule.forFeature([
    Game,
    GameSessionPlayer,
    GameSessionQueue,
    Win
  ]),
    UsersModule],
})
export class GameModule { }
