import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class AdminBootstrapGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-bootstrap-token'];

    const expected = this.config.get<string>('ADMIN_BOOTSTRAP_TOKEN');

    if (
      typeof token !== 'string' ||
      !expected ||
      token.length !== expected.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('Invalid bootstrap token');
    }

    const adminCount = await this.prisma.adminUser.count();

    if (adminCount > 0) {
      throw new UnauthorizedException('Bootstrap is already completed');
    }

    return true;
  }
}
