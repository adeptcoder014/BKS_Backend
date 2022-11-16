import { sendEmail } from './email.js';
import { sendPush } from './push.js';
import { sendSMS } from './sms.js';
import { sendWhatsapp } from './whatsapp.js';

/**
 * @param {object} options
 * @param {import('./sms').SMSOptions} [options.sms] Sms notification
 * @param {import('./whatsapp').WhatsappOptions} [options.whatsapp] Whatsapp notification
 * @param {import('./push').PushOptions} [options.push] Push notification
 * @param {import('./email').EmailOptions} [options.email] Email notification
 */
export default function sendNotification(options) {
  const { sms, whatsapp, push, email } = options;

  if (sms) sendSMS(sms);
  if (whatsapp) sendWhatsapp(whatsapp);
  if (push) sendPush(push);
  if (email) sendEmail(email);
}
