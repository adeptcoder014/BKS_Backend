import qs from 'qs';
import axios from '../utils/axios.js';

const apiUrl = process.env.SMS_API_URL;
const apiKey = process.env.SMS_API_KEY;
const route = process.env.SMS_ROUTE;
const defaultSenderId = process.env.SMS_SENDER_ID;
const defaultPeid = process.env.SMS_PEID;

/**
 * @typedef {object} SMSOptions
 * @property {string} mobile
 * @property {string} content
 * @property {string} [senderId]
 * @property {string} [channel]
 */

/**
 * @param {SMSOptions} options
 */
export const sendSMS = async (options) => {
  const {
    mobile,
    content,
    senderId = defaultSenderId,
    peid = defaultPeid,
    channel = 'Trans',
  } = options;

  const query = qs.stringify({
    APIKey: apiKey,
    senderid: senderId,
    peid: peid,
    channel,
    number: mobile,
    text: content,
    route,
    DCS: 0,
    flashsms: 0,
  });

  return axios
    .get(`${apiUrl}?${query}`)
    .then((data) => [null, data])
    .catch((err) => {
      console.error(err);
      return [err, null];
    });
};

export const sendOTP = async (mobile, otp) => {
  return sendSMS({
    mobile,
    content: `${otp} is the OTP for your log in and creation of MPIN on BKS MyGold app. Valid for 5minutes only. DO NOT disclose it to anyone for security reasons. We never ask for OTP.`,
  });
};
