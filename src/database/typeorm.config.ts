import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DB_CONNECTION_URL,
  synchronize: true, // ❗ Use true only in dev
  autoLoadEntities: true,
};
