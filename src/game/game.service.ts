import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { GameSessionPlayer } from './entities/game-player.entity';
import { GameSessionQueue } from './entities/game-player-queue.entity';
import { UsersService } from 'src/users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Win } from './entities/win.entity';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Win)
    private readonly winRepo: Repository<Win>,
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GameSessionPlayer)
    private readonly playerRepo: Repository<GameSessionPlayer>,
    @InjectRepository(GameSessionQueue)
    private readonly queueRepo: Repository<GameSessionQueue>,
    private readonly usersService: UsersService,
    private eventEmitter: EventEmitter2,
  ) { }

  private inactivityTimeoutMs = 2 * 60 * 1000; // 2 minutes

  async getActivePublic() {
    const games = await this.gameRepo.find({
      where: { status: In([GameStatus.WAITING, GameStatus.ACTIVE]) },
      relations: ['players', 'queue'],
    });

    return { result: games };
  }

  async joinOrCreateSession(userId: string, chosenNumber: number) {
    try {
      let session = await this.gameRepo.findOne({
        where: { status: In([GameStatus.WAITING, GameStatus.ACTIVE]) },
        relations: ['players', 'queue'],
      });

      if (!session) {
        session = await this.createSession(userId, chosenNumber);
        return { session, message: 'New session created and joined' };
      }

      if (session.players?.some(p => p.userId === userId)) {
        return { session, message: 'User already joined as player' };
      }

      if (session.queue?.some(q => q.userId === userId)) {
        return { session, message: 'User already in queue' };
      }

      const maxPlayers = Number(process.env.MAX_PLAYERS) || 10;

      if (session.players.length >= maxPlayers) {
        const queuePosition = (session.queue?.length || 0) + 1;
        const queued = this.queueRepo.create({
          sessionId: String(session.id),
          session,
          userId,
          chosenNumber,
          position: queuePosition,
        });
        await this.queueRepo.save(queued);

        return {
          session,
          message: `Session full. Added to queue at position ${queuePosition}`,
        };
      }

      const player = this.playerRepo.create({
        sessionId: String(session.id),
        session,
        userId,
        chosenNumber,
        joinedAt: new Date(),
      });
      await this.playerRepo.save(player);

      this.eventEmitter.emit('game.player.joined', {
        session,
      });

      return { session, message: 'User successfully joined session' };
    } catch (error) {
      throw error;
    }
  }

  async createSession(userId: string, chosenNumber?: number): Promise<Game> {
    try {
      const now = new Date();
      const waitingDuration = 10 * 1000; // 10 sec
      const activeDuration = 20 * 1000;  // 20 sec

      let session = this.gameRepo.create({
        createdByUserId: userId,
        startTime: now,
        endTime: new Date(now.getTime() + waitingDuration + activeDuration),
        status: GameStatus.WAITING,
        maxPlayers: Number(process.env.MAX_PLAYERS) || 10,
        lastActivityTime: now,

      });

      session = await this.gameRepo.save(session);

      const player = this.playerRepo.create({
        sessionId: String(session.id),
        session,
        userId,
        chosenNumber: chosenNumber ?? Math.floor(Math.random() * 9) + 1,
        joinedAt: now,
      });
      await this.playerRepo.save(player);

      // Promote queued users FIFO
      const queuedUsers = await this.queueRepo.find({
        order: { position: 'ASC' },
      });

      for (const q of queuedUsers) {
        if (session.players.length >= session.maxPlayers) break;

        const promotedPlayer = this.playerRepo.create({
          session,
          userId: q.userId,
          chosenNumber: q.chosenNumber,
          joinedAt: new Date(),
        });
        await this.playerRepo.save(promotedPlayer);
        await this.queueRepo.remove(q);
      }

      const updatedSession = await this.gameRepo.findOne({
        where: { id: session.id },
        relations: ['players', 'queue'],
      });

      if (!updatedSession) {
        throw new Error('Session not found after creation');
      }

      return updatedSession;
    }
    catch (error) {
      throw error;
    }
  }

  async leaveSession(userId: string, sessionId: string) {
    try {
      const session = await this.gameRepo.findOne({
        where: { id: Number(sessionId) },
        relations: ['players', 'queue'],
      });

      if (!session) throw new Error('Session not found');

      const player = session.players.find(p => p.userId === userId);
      if (player) {
        await this.playerRepo.remove(player);
        this.eventEmitter.emit('game.player.left', { sessionId, userId });
      }

      // Promote first user from queue if exists
      if (session.queue.length > 0) {
        const firstInQueue = session.queue.sort((a, b) => a.position - b.position)[0];

        const newPlayer = this.playerRepo.create({
          session,
          userId: firstInQueue.userId,
          chosenNumber: firstInQueue.chosenNumber,
          joinedAt: new Date(),
        });
        await this.playerRepo.save(newPlayer);
        await this.queueRepo.remove(firstInQueue);

        this.eventEmitter.emit('game.player.promoted', {
          sessionId,
          userId: firstInQueue.userId,
        });
      }

      return await this.gameRepo.findOne({
        where: { id: session.id },
        relations: ['players', 'queue'],
      });
    } catch (error) {
      throw error;
    }
  }

  async endSession(session: Game) {
    const winningNumber = Math.floor(Math.random() * 9) + 1;
    const winners = session.players.filter(player => player.chosenNumber === winningNumber);

    session.status = GameStatus.ENDED;
    session.winningNumber = winningNumber;
    await this.gameRepo.save(session);

    // Fire event for session end
    this.eventEmitter.emit('game.session.ended', {
      sessionId: session.id,
      winningNumber,
      winners: winners.map(winner => winner.userId),
    });

    // Fire event for each winner
    for (const winner of winners) {
      this.eventEmitter.emit('game.player.won', {
        sessionId: session.id,
        userId: winner.userId,
        chosenNumber: winner.chosenNumber,
      });

      await this.recordWin(Number(winner.userId))
    }

  }

  async recordWin(userId: number) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      const win = this.winRepo.create({ user });
      return await this.winRepo.save(win);

    } catch (error) {
      throw new InternalServerErrorException('Failed to record win');
    }
  }

  // 🔹 Cron scheduler every second
  @Cron(CronExpression.EVERY_SECOND)
  async gameScheduler() {
    const now = new Date();
    const sessions = await this.gameRepo.find({
      where: { status: Not(GameStatus.ENDED) },
      relations: ['players', 'queue'],
    });

    for (const session of sessions) {
      // 1️⃣ Inactivity check → end after 2 min
      if (now.getTime() - session.lastActivityTime.getTime() > this.inactivityTimeoutMs) {
        await this.endSession(session);
        continue;
      }

      // 2️⃣ WAITING → ACTIVE after 10 sec
      if (session.status === GameStatus.WAITING) {
        if (now.getTime() - session.startTime.getTime() >= 10 * 1000) {
          await this.moveToActive(session);
        }
      }

      // 3️⃣ ACTIVE → END after 20 sec
      if (session.status === GameStatus.ACTIVE) {
        if (now > session.endTime) {
          await this.endSession(session);

          // Only start next session if queue exists
          const hasQueuedUsers = (await this.queueRepo.count()) > 0;
          if (hasQueuedUsers) {
            const firstQueueUser = await this.queueRepo.findOne({ order: { position: 'ASC' } });
            if (firstQueueUser) {
              await this.createSession(firstQueueUser.userId, firstQueueUser.chosenNumber);
            }
          }
        }
      }
    }
  }

  async moveToActive(session: Game) {
    session.status = GameStatus.ACTIVE;
    session.startTime = new Date();
    session.endTime = new Date(session.startTime.getTime() + 20 * 1000);
    await this.gameRepo.save(session);
  }

  async getTopPlayers() {
    return this.usersService.getTopPlayers();
  }

  async getSessionsGroupedByDate() {
    const sessions = await this.gameRepo.find();
    return sessions.reduce((acc, session) => {
      const date = session.startTime.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = []; acc[date].push(session); return acc;
    }, {} as Record<string, Game[]>);
  }


  async getTopPlayersByGroup(period: 'all' | 'day' | 'week' | 'month' = 'all') {
    try {
      const query = this.winRepo
        .createQueryBuilder('win')
        .leftJoin('win.user', 'user')
        .select('user.id', 'userId')
        .addSelect('user.username', 'username')
        .addSelect('COUNT(win.id)', 'totalWins')
        .groupBy('user.id')
        .addGroupBy('user.username')
        .orderBy('COUNT(win.id)', 'DESC')
        .limit(10);
  
      if (period !== 'all') {
        const now = new Date();
        let startDate: Date;
  
        switch (period) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week': {
            const firstDayOfWeek = now.getDate() - now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
            break;
          }
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
  
        query.andWhere('win.createdAt >= :startDate', { startDate });
      }
  
      return await query.getRawMany(); // returns { userId, username, totalWins }
    } catch (error) {
      throw new Error('Failed to fetch top players');
    }
  }
  

}
