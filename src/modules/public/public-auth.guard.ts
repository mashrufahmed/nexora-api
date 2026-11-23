import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { SitesService } from '../sites/sites.service.js';
import { PUBLIC_CACHE_CONTROL } from './public.constants.js';

@Injectable()
export class PublicAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly sites: SitesService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    context.switchToHttp().getResponse().header('Cache-Control', PUBLIC_CACHE_CONTROL);
    const configured = this.config.get<string>('PUBLIC_SERVICE_KEY');
    const serviceKey = request.headers['x-service-key'];
    const siteHost = request.headers['x-site-host'];
    if (configured && typeof serviceKey === 'string' && serviceKey === configured && typeof siteHost === 'string' && siteHost.trim()) {
      request.site = await this.sites.resolveHostname(siteHost.trim().split(':')[0]);
      return true;
    }
    const host = request.headers.host?.split(':')[0]?.trim();
    const siteKey = request.headers['x-site-key'];
    if (!host || typeof siteKey !== 'string' || !siteKey.trim()) throw new UnauthorizedException('Public authentication required');
    request.site = await this.sites.authenticatePublicSite(host, siteKey);
    return true;
  }
}