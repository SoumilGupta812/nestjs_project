import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserEventsService } from 'src/events/user-events.service';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private postRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly userEventsService: UserEventsService,
  ) {
    bcrypt.hash('adminpassword', 10).then(console.log);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.postRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(registerDto.password);
    const newlyCreatedUser = this.postRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: UserRole.USER,
    });

    const saveUser = await this.postRepository.save(newlyCreatedUser);
    this.userEventsService.emitUserRegistered(saveUser);
    const { password, ...result } = saveUser;
    return {
      user: result,
      message: 'User registered successfully',
    };
  }

  async createAdmin(registerDto: RegisterDto) {
    const existingUser = await this.postRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await this.hashPassword(registerDto.password);
    const newlyCreatedUser = this.postRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });

    const saveUser = await this.postRepository.save(newlyCreatedUser);

    const { password, ...result } = saveUser;
    return {
      user: result,
      message: 'Admin registered successfully',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.postRepository.findOne({
      where: { email: loginDto.email },
    });

    if (
      !user ||
      !(await this.verifyPassword(loginDto.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = this.generateTokens(user);
    const { password, ...result } = user;
    return {
      user: result,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: number }>(refreshToken, {
        secret: 'refresh token',
      });
      const user = await this.postRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(id: number) {
    const user = await this.postRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...result } = user;
    return result;
  }
  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private generateTokens(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: 'hi there i should not be here',
      expiresIn: '15m',
    });
  }
  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
    };
    return this.jwtService.sign(payload, {
      secret: 'refresh token',
      expiresIn: '7d',
    });
  }
}
