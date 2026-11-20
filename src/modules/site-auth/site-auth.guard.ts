import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SitesService } from '../sites/sites.service.js';

@Injectable()
export class SiteAuthGuard implements CanActivate {
  constructor(private readonly sites: SitesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const hostname = request.headers.host?.split(':')[0]?.trim();
    const siteKey = request.headers['x-site-key'];

    if (!hostname || typeof siteKey !== 'string' || !siteKey.trim()) {
      throw new UnauthorizedException('Site authentication required');
    }

    request.site = await this.sites.authenticatePublicSite(hostname, siteKey);
    return true;
  }
}