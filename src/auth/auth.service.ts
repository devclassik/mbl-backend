import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { GameSessionPlayer } from 'src/game/entities/game-player.entity';
import { Game } from 'src/game/entities/game.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Game)
    private readonly gamePlayerRepo: Repository<Game>,
    private readonly jwt: JwtService
  ) { }

  async register(username: string) {
    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      throw new ConflictException('Username already taken');
    }
    const user = await this.usersService.create(username);
    return { message: 'Registration successful', user };
  }

  async login(username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If activeSessionId check is needed here, uncomment later
    // if (user.activeSessionId) {
    //   throw new UnauthorizedException('User is already in an active session');
    // }

    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwt.sign(payload, { secret: process.env.JWT_SECRET });

    const totalGames = await this.gamePlayerRepo.count({
      where: { createdByUserId: String(user.id) },
    });

    return { accessToken, user, totalGames };
  }


}
