import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcome(email: string, name: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome!',
      template: 'welcome',
      context: { name },
    });
  }

  async sendInvite(
    email: string,
    inviterName: string,
    companyName: string,
    inviteUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `You have been invited to join ${companyName}`,
      template: 'invite-member',
      context: { inviterName, companyName, inviteUrl },
    });
  }

  async sendDocumentEmail(
    email: string,
    senderName: string,
    documentName: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `${senderName} sent you a document`,
      template: 'document-sent',
      context: { senderName, documentName },
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
