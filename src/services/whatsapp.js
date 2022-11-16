import axios from '../utils/axios.js';

const baseUrl = 'https://graph.facebook.com/v13.0';
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

/**
 * @typedef {object} WhatsappOptions
 * @property {string} mobile
 * @property {string} template
 */

/**
 * @param {WhatsappOptions} options
 */
export const sendWhatsapp = async ({ mobile, template }) => {
  return axios({
    url: `${baseUrl}/${phoneNumberId}/messages`,
    method: 'POST',
    data: {
      messaging_product: 'whatsapp',
      to: mobile,
      type: 'template',
      template: {
        name: template,
        language: {
          code: 'en_US',
        },
      },
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then((data) => [null, data])
    .catch((err) => [err, null]);
};
