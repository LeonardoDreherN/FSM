import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;
  private readonly trackingBase: string;

  constructor(
    config: ConfigService,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
  ) {
    this.apiUrl = config.get<string>('WHATSAPP_API_URL', '');
    this.apiKey = config.get<string>('WHATSAPP_API_KEY', '');
    this.instance = config.get<string>('WHATSAPP_INSTANCE', '');
    this.trackingBase = config.get<string>('TRACKING_BASE_URL', 'https://track.exemplo.com.br');
  }

  async sendTechnicianDispatched(order: ServiceOrder): Promise<void> {
    if (!order.clientPhone) return;

    const trackingUrl = `${this.trackingBase}/${order.trackingToken}`;
    const message =
      `Olá ${order.clientName}! 👋\n\n` +
      `Seu técnico está a caminho para o atendimento.\n` +
      `Acompanhe em tempo real pelo link abaixo:\n\n` +
      `🗺️ ${trackingUrl}`;

    await this.sendWhatsApp(order.clientPhone, message, order.id);
  }

  async sendCompletionNotification(order: ServiceOrder): Promise<void> {
    if (!order.clientPhone) return;

    const message =
      `Olá ${order.clientName}! ✅\n\n` +
      `Seu atendimento foi concluído com sucesso. Obrigado pela preferência!`;

    await this.sendWhatsApp(order.clientPhone, message, order.id);
  }

  private async sendWhatsApp(
    phone: string,
    message: string,
    orderId?: string,
  ): Promise<void> {
    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn('WhatsApp não configurado — mensagem não enviada');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');

    try {
      await axios.post(
        `${this.apiUrl}/message/sendText/${this.instance}`,
        { number: `${cleanPhone}@s.whatsapp.net`, text: message },
        { headers: { apikey: this.apiKey }, timeout: 10000 },
      );
      this.logger.log(`WhatsApp enviado para ${cleanPhone} | OS: ${orderId}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar WhatsApp para ${cleanPhone}: ${err.message}`);
    }
  }
}
