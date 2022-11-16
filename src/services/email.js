import sendGrid from '@sendgrid/mail';
import logger from '../utils/logger.js';

sendGrid.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * @typedef {object} EmailOptions
 * @property {string} to
 * @property {string} subject
 * @property {string} content
 * @property {string} template
 * @property {object} data
 */

/**
 * @param {EmailOptions} options
 * @returns
 */
export const sendEmail = async (options) => {
  const { to, subject, content, template, data, ...rest } = options;

  try {
    const res = await sendGrid.send({
      from: process.env.SENDGRID_FROM_EMAIL,
      to,
      subject,
      text: content,
      templateId: template,
      dynamicTemplateData: data,
      ...rest,
    });
    return [null, res];
  } catch (err) {
    logger.error(err);
    return [err, null];
  }
};
