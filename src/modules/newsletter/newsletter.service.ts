import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { VerificationService } from '../verification/verification.service.js';
import { SubscribeDto } from './dto/newsletter.dto.js';
@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly verification: VerificationService,
    private readonly mail: MailService,
    private readonly siteAccess: SiteAccessService,
  ) {}
  private access(uid: string, sid: string) { return this.siteAccess.assertSiteAccess(uid, sid); }
  async subscribe(dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    const unsubscribeToken = randomBytes(32).toString('hex');
    let subscriber;
    try {
      subscriber = await this.prisma.newsletterSubscriber.upsert({
        where: {
          siteId_normalizedEmail: {
            siteId: dto.siteId,
            normalizedEmail: email,
          },
        },
        create: {
          siteId: dto.siteId,
          email,
          normalizedEmail: email,
          source: dto.source,
          unsubscribeTokenHash: createHash('sha256')
            .update(unsubscribeToken)
            .digest('hex'),
        },
        update: {
          email,
          source: dto.source,
          status: 'PENDING',
          unsubscribedAt: null,
          unsubscribeTokenHash: createHash('sha256')
            .update(unsubscribeToken)
            .digest('hex'),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException('Subscriber already exists');
      throw e;
    }
    const token = await this.verification.issue(
      'newsletter_subscriber',
      subscriber.id,
      email,
    );
    await this.mail.sendMail({
      to: email,
      subject: 'Confirm your newsletter subscription',
      html: `<p>Confirm your subscription with this token:</p><p>${token}</p>`,
    });
    return {
      subscriberId: subscriber.id,
      verificationToken: token,
      unsubscribeToken,
    };
  }
  async verify(id: string, token: string) {
    await this.verification.verify('newsletter_subscriber', id, token);
    return this.prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        verifiedAt: new Date(),
        subscribedAt: new Date(),
      },
    });
  }
  async unsubscribe(id: string, token: string) {
    const s = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (
      !s ||
      !s.unsubscribeTokenHash ||
      s.unsubscribeTokenHash !==
        createHash('sha256').update(token).digest('hex')
    )
      throw new NotFoundException('Invalid unsubscribe token');
    return this.prisma.newsletterSubscriber.update({
      where: { id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
  }
  async list(siteId: string, uid: string) {
    await this.access(uid, siteId);
    return this.prisma.newsletterSubscriber.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
