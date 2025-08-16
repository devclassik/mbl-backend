import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(username: string): Promise<User> {
    const existing = await this.findByUsername(username);
    if (existing) throw new Error('Username already taken');
    const user = this.usersRepo.create({ username });
    return this.usersRepo.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { username } });
  }
  
  async getTopPlayers() {
    return this.usersRepo.find({
      order: { wins: 'DESC' },
      take: 10,
    });
  }
}
