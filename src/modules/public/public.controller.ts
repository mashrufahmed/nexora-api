import { Controller, Get, Headers, Param, UseGuards } from '@nestjs/common';
import { SiteAuthGuard } from '../site-auth/site-auth.guard.js';
import { PublicService } from './public.service.js';

@Controller('public')
@UseGuards(SiteAuthGuard)
export class PublicController {
  constructor(private readonly service: PublicService) {}
  private host(host?: string) { return host ?? ''; }
  @Get('site') site(@Headers('host') host: string) { return this.service.site(this.host(host)); }
  @Get('content') contents(@Headers('host') host: string) { return this.service.content(this.host(host)); }
  @Get('content/:slug') content(@Headers('host') host: string, @Param('slug') slug: string) { return this.service.content(this.host(host), slug); }
  @Get('products') products(@Headers('host') host: string) { return this.service.products(this.host(host)); }
  @Get('products/:slug') product(@Headers('host') host: string, @Param('slug') slug: string) { return this.service.products(this.host(host), slug); }
  @Get('guides') guides(@Headers('host') host: string) { return this.service.guides(this.host(host)); }
  @Get('guides/:slug') guide(@Headers('host') host: string, @Param('slug') slug: string) { return this.service.guides(this.host(host), slug); }
  @Get('comparisons') comparisons(@Headers('host') host: string) { return this.service.guides(this.host(host), undefined, true); }
  @Get('comparisons/:slug') comparison(@Headers('host') host: string, @Param('slug') slug: string) { return this.service.guides(this.host(host), slug, true); }
  @Get('authors') authors(@Headers('host') host: string) { return this.service.authors(this.host(host)); }
  @Get('authors/:slug') author(@Headers('host') host: string, @Param('slug') slug: string) { return this.service.authors(this.host(host), slug); }
}