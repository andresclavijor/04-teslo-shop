import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;
      const user = this.userRepository.create({
        password: bcrypt.hashSync(password, 10),
        ...userData,
      });
      await this.userRepository.save(user);
      delete user.password;
      return {
        ...user,
        token: this.getJwtToken({ email: user.email, id: user.id }),
      };
    } catch (error) {
      this.handleDbErrors(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credentials are not valid (email)');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Credentials are not valid (password)');
    }
    delete user.password;
    return {
      ...user,
      token: this.getJwtToken({ email: user.email, id: user.id }),
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);

    return token;
  }

  async checkAuthStatus(user: User) {
    console.log('user', user);
    delete user.password;
    delete user.roles;
    return {
      ...user,
      token: this.getJwtToken({ email: user.email, id: user.id }),
    };
  }

  private handleDbErrors(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    console.error(error);
    throw new InternalServerErrorException('Please Check errors logs');
  }
}
