import { Controller, Get, Post, Body, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) { }

  @Get('active')
  getActive() {
    return this.gameService.getActivePublic();
  }

  @UseGuards(JwtAuthGuard)
  @Post('notify-login')
  onUserLogin(
    @Req() req: any,
    @Body('chosenNumber') chosenNumber: number
  ) {
    return this.gameService.joinOrCreateSession(req.user.userId, chosenNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('leave/:sessionId')
  leaveSpecific(
    @Req() req: any,
    @Param('sessionId') sessionId: string
  ) {
    return this.gameService.leaveSession(req.user.userId, sessionId);
  }

  @Get('sessions-by-date')
  getSessionsByDate() {
    return this.gameService.getSessionsGroupedByDate();
  }

  @Get('top')
  getTopPlayers() {
    return this.gameService.getTopPlayers();
  }

  @Get('top-by-group')
  getTopPlayersByGroup(
    @Param(':/group') group: 'all' | 'day' | 'week' | 'month' = 'all'
  ) {
    return this.gameService.getTopPlayersByGroup(group);
  }
}
