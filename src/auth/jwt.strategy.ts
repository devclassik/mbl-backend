import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private user: UsersService
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }


  async validate(payload: any) {
    const user = await this.user.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }

    return { userId: payload.sub, username: payload.username }
  }

  // async validate(payload: any) {
  //   return { userId: payload.sub, username: payload.username };
  // }
}
