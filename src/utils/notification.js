import dayjs from 'dayjs';
import { sendPush } from '../services/push.js';
import { sendSMS } from '../services/sms.js';

/**
 * @todo => to be done
 */
export const NotificationType = {
  // orders
  ORDER_BEING_PACKED: 'order_being_packed',
  ORDER_DISPATCHED: 'order_dispatched',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',

  INSTANT_BUY_GOLD: 'instant_buy_gold',

  // merchant
  NEW_SALE: 'new-sale',
};

/**
 * @typedef {object} NotifyOptions
 * @property {string} type
 * @property {string} [mobile]
 * @property {string} [email]
 * @property {string} [deviceToken]
 * @property {object} [data]
 */

/**
 * @param {NotifyOptions} options
 */
export default async function notify(options) {
  const { type, email, mobile, deviceToken, data } = options;

  switch (type) {
    // orders
    case NotificationType.ORDER_BEING_PACKED:
      sendSMS({
        mobile,
        content: `BKS MyGold Order number #${data.orderId} is being packed. Thank you for placing your trust and order with us`,
      });
      break;

    case NotificationType.ORDER_DISPATCHED:
      sendSMS({
        mobile,
        content: `Dispatched: BKS MyGold Order number ${data.orderId} for Rs ${
          data.totalAmount
        } has been successfully dispatched. Estimated Delivery Date ${dayjs(
          data.estimatedDeliveryDate
        ).format('DD/MM/YYYY')}. Track: ${data.trackingUrl}. `,
      });

      sendPush({
        token: deviceToken,
        content: `Dispatched: BKS MyGold Order number #${data.orderId} for Rs ${
          data.totalAmount
        } has been successfully dispatched. Estimated Delivery Date ${dayjs(
          data.estimatedDeliveryDate
        ).format('DD/MM/YYYY')}.`,
      });
      break;

    case NotificationType.ORDER_SHIPPED:
      sendSMS({
        mobile,
        content: `Shipped: We are happy to let you know that your BKS MyGold Order number ${
          data.orderId
        } has been shipped and is on its way to you. Estimated Delivery Date: ${dayjs(
          data.estimatedDeliveryDate
        ).format('DD/MM/YYYY')},Track: ${data.trackingUrl}`,
      });
      break;

    case NotificationType.ORDER_DELIVERED:
      sendSMS({
        mobile,
        content: `Delivered: BKS MyGold Order number #${data.orderId} for Rs ${data.totalAmount} has been successfully delivered. Click @todo for more info.`,
      });
      sendPush({
        token: deviceToken,
        title: `Delivered:  #${data.orderId}`,
        content: `Order number #${data.orderId} for Rs ${data.totalAmount} has been successfully delivered`,
      });
      break;

    // merchant
    case NotificationType.NEW_SALE:
      sendPush({
        token: deviceToken,
        title: 'New Sale',
        content: `A user purchased ${data.weight} g of 24KT Gold`,
      });
      break;

    // customer
    case NotificationType.INSTANT_BUY_GOLD:
      sendSMS({
        mobile,
        content: `Thank you for purchasing ${data.weight} g of 24KT Gold worth Rs ${data.amount}. Click here to download Invoice and Note of Custody. Your BKS MyGold Bank balance is ${data.balance} g.`,
      });
      sendPush({
        token: deviceToken,
        title: 'Gold Purchased',
        content: `Thank you for purchasing ${data.weight} g of 24KT Gold worth Rs ${data.amount}.`,
      });
      break;
  }
}
