import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { PublicAuthGuard } from './public-auth.guard.js';
import { PublicService } from './public.service.js';
import { PublicListQueryDto } from './dto/public-list-query.dto.js';
import { PublicSlugParamDto } from './dto/public-slug-param.dto.js';

@Controller('public')
@UseGuards(PublicAuthGuard)
export class PublicController {
  constructor(private readonly service: PublicService) {}
  private host(host?: string) { return host ?? ''; }
  private requestHost(siteHost?: string, host?: string) { return siteHost ?? host ?? ''; }
  @Get('site') site(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string) { return this.service.site(this.requestHost(siteHost, host)); }
  @Get('content') contents(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Query() query: PublicListQueryDto) { return this.service.content(this.requestHost(siteHost, host), undefined, query); }
  @Get('content/:slug') content(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Param() params: PublicSlugParamDto) { return this.service.content(this.requestHost(siteHost, host), params.slug); }
  @Get('products') products(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Query() query: PublicListQueryDto) { return this.service.products(this.requestHost(siteHost, host), undefined, query); }
  @Get('products/:slug') product(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Param() params: PublicSlugParamDto) { return this.service.products(this.requestHost(siteHost, host), params.slug); }
  @Get('guides') guides(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Query() query: PublicListQueryDto) { return this.service.guides(this.requestHost(siteHost, host), undefined, false, query); }
  @Get('guides/:slug') guide(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Param() params: PublicSlugParamDto) { return this.service.guides(this.requestHost(siteHost, host), params.slug); }
  @Get('comparisons') comparisons(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Query() query: PublicListQueryDto) { return this.service.guides(this.requestHost(siteHost, host), undefined, true, query); }
  @Get('comparisons/:slug') comparison(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Param() params: PublicSlugParamDto) { return this.service.guides(this.requestHost(siteHost, host), params.slug, true); }
  @Get('authors') authors(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Query() query: PublicListQueryDto) { return this.service.authors(this.requestHost(siteHost, host), undefined, query); }
  @Get('authors/:slug') author(@Headers('x-site-host') siteHost: string | undefined, @Headers('host') host: string, @Param() params: PublicSlugParamDto) { return this.service.authors(this.requestHost(siteHost, host), params.slug); }
}