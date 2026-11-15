import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: this.config.get<number>('MAIL_PORT', 587) === 465,
      auth: {
        user: this.config.getOrThrow<string>('MAIL_USER'),
        pass: this.config.getOrThrow<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('MAIL_FROM'),
      ...options,
    });
  }
}
