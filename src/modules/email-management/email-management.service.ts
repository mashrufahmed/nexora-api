import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { SendEmailDto, SenderDto, TemplateDto } from './dto/email.dto.js';
@Injectable()
export class EmailManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly siteAccess: SiteAccessService,
    @InjectQueue('email-sending') private readonly emailQueue: Queue,
  ) {}
  private access(uid: string, sid: string) { return this.siteAccess.assertSiteAccess(uid, sid); }
  async sender(d: SenderDto, uid: string) {
    await this.access(uid, d.siteId);
    try { return await this.prisma.emailSender.create({
      data: {
        siteId: d.siteId,
        name: d.name.trim(),
        emailAddress: d.emailAddress.toLowerCase(),
        replyTo: d.replyTo?.toLowerCase(),
      },
    }); } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Sender email already exists for this site'); throw e; }
  }
  async template(d: TemplateDto, uid: string) {
    await this.access(uid, d.siteId);
    try { return await this.prisma.emailTemplate.create({
      data: {
        siteId: d.siteId,
        name: d.name.trim(),
        slug: d.slug.trim().toLowerCase(),
        subject: d.subject,
        htmlBody: d.htmlBody,
        textBody: d.textBody,
        variables: d.variables ?? [],
      },
    }); } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Template slug already exists for this site'); throw e; }
  }
  private sanitize(html: string) { return html.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '').replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '').replace(/javascript:/gi, ''); }
  private render(value: string, variables: Record<string, string> | undefined, allowed: string[] = []) { const used = [...value.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((m) => m[1]); const invalid = used.filter((key) => !allowed.includes(key) || variables?.[key] === undefined); if (invalid.length) throw new BadRequestException(`Missing or undeclared email variables: ${[...new Set(invalid)].join(', ')}`); return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => variables![key]); }
  async send(d: SendEmailDto, uid: string) {
    await this.access(uid, d.siteId);
    let subject = d.subject;
    let html = d.htmlBody;
    let allowed: string[] = [];
    if (d.senderId) {
      const sender = await this.prisma.emailSender.findFirst({ where: { id: d.senderId, siteId: d.siteId, status: 'ACTIVE' } });
      if (!sender) throw new BadRequestException('Sender is not active for this site');
    }
    if (d.templateId) {
      const template = await this.prisma.emailTemplate.findFirst({ where: { id: d.templateId, siteId: d.siteId, status: 'ACTIVE' } });
      if (!template) throw new NotFoundException('Email template not found');
      subject = template.subject;
      html = template.htmlBody;
      allowed = Array.isArray(template.variables) ? template.variables.filter((v): v is string => typeof v === 'string') : [];
    }
    subject = this.render(subject, d.variables, allowed);
    html = this.sanitize(this.render(html, d.variables, allowed));
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
    await this.emailQueue.add('send', { emailMessageId: msg.id }, { jobId: `email-send:${msg.id}`, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: 1000 });
    await this.audit.log({ actorAdminId: uid, action: 'email.queued', entityType: 'email_message', entityId: msg.id });
    return msg;
  }
  async history(siteId: string, uid: string) {
    await this.access(uid, siteId);
    return this.prisma.emailMessage.findMany({
      where: { siteId },
      include: { sender: true, template: true }, orderBy: { createdAt: 'desc' },
    });
  }
  async senders(siteId: string, uid: string) { await this.access(uid, siteId); return this.prisma.emailSender.findMany({ where: { siteId }, orderBy: { name: 'asc' } }); }
  async templates(siteId: string, uid: string) { await this.access(uid, siteId); return this.prisma.emailTemplate.findMany({ where: { siteId }, orderBy: { name: 'asc' } }); }
  async deliver(id: string) { const message = await this.prisma.emailMessage.findUnique({ where: { id } }); if (!message) throw new NotFoundException('Email message not found'); if (message.status === 'SENT') return message; try { await this.mail.sendMail({ to: message.recipient, subject: message.subject, html: message.htmlBody }); const sent = await this.prisma.emailMessage.updateMany({ where: { id, status: { not: 'SENT' } }, data: { status: 'SENT', sentAt: new Date(), error: null } }); await this.audit.log({ action: 'email.sent', entityType: 'email_message', entityId: id }); return sent; } catch (e) { await this.prisma.emailMessage.update({ where: { id }, data: { status: 'FAILED', error: e instanceof Error ? e.message.slice(0, 500) : 'Delivery failed' } }); throw e; } }
}
