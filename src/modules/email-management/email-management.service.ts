import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SendEmailDto, SenderDto, TemplateDto } from './dto/email.dto.js';
@Injectable()
export class EmailManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}
  private async access(uid: string, sid: string) {
    const a = await this.prisma.adminUser.findUnique({
      where: { id: uid },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (a?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    if (
      !(await this.prisma.userSiteAccess.findUnique({
        where: { userId_siteId: { userId: uid, siteId: sid } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException('You do not have access to this site');
  }
  async sender(d: SenderDto, uid: string) {
    await this.access(uid, d.siteId);
    return this.prisma.emailSender.create({
      data: {
        siteId: d.siteId,
        name: d.name.trim(),
        emailAddress: d.emailAddress.toLowerCase(),
        replyTo: d.replyTo?.toLowerCase(),
      },
    });
  }
  async template(d: TemplateDto, uid: string) {
    await this.access(uid, d.siteId);
    return this.prisma.emailTemplate.create({
      data: {
        siteId: d.siteId,
        name: d.name.trim(),
        slug: d.slug.trim().toLowerCase(),
        subject: d.subject,
        htmlBody: d.htmlBody,
        textBody: d.textBody,
        variables: d.variables ?? [],
      },
    });
  }
  private sanitize(html: string) { return html.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '').replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '').replace(/javascript:/gi, ''); }
  private render(value: string, variables: Record<string, string> | undefined) { return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => variables?.[key] ?? ''); }
  async send(d: SendEmailDto, uid: string) {
    await this.access(uid, d.siteId);
    let subject = d.subject;
    let html = d.htmlBody;
    if (d.senderId) {
      const sender = await this.prisma.emailSender.findFirst({ where: { id: d.senderId, siteId: d.siteId, status: 'ACTIVE' } });
      if (!sender) throw new BadRequestException('Sender is not active for this site');
    }
    if (d.templateId) {
      const template = await this.prisma.emailTemplate.findFirst({ where: { id: d.templateId, siteId: d.siteId, status: 'ACTIVE' } });
      if (!template) throw new NotFoundException('Email template not found');
      subject = template.subject;
      html = template.htmlBody;
    }
    html = this.sanitize(this.render(html, undefined));
    const msg = await this.prisma.emailMessage.create({
      data: {
        siteId: d.siteId,
        senderId: d.senderId,
        templateId: d.templateId,
        recipient: d.recipient.toLowerCase(),
        subject,
        htmlBody: html,
      },
    });
    try {
      await this.mail.sendMail({
        to: d.recipient,
        subject,
        html,
      });
      const sent = await this.prisma.emailMessage.update({
        where: { id: msg.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      await this.audit.log({
        actorAdminId: uid,
        action: 'email.sent',
        entityType: 'email_message',
        entityId: msg.id,
      });
      return sent;
    } catch (e) {
      await this.prisma.emailMessage.update({
        where: { id: msg.id },
        data: {
          status: 'FAILED',
          error:
            e instanceof Error ? e.message.slice(0, 500) : 'Delivery failed',
        },
      });
      throw e;
    }
  }
  async history(siteId: string, uid: string) {
    await this.access(uid, siteId);
    return this.prisma.emailMessage.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
