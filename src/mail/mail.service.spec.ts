import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service.js';
import { ConfigService } from '@nestjs/config';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: ConfigService, useValue: { getOrThrow: (key: string) => key === 'MAIL_FROM' ? 'test@example.com' : 'test', get: (_key: string, fallback?: unknown) => fallback ?? 587 } }],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
