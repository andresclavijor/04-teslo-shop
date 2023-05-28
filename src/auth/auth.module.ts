import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthService],
  exports: [TypeOrmModule],
})
export class AuthModule {}
