import omitBy from 'lodash/omitBy.js';
import isNil from 'lodash/isNil.js';
import firebase from './firebase.js';

export const formatMessage = (message) => {
  const finalPayload = {
    notification: omitBy(
      {
        title: message.title,
        body: message.content,
        imageUrl: message.image,
      },
      isNil
    ),
    data: omitBy(
      {
        url: message.url,
        screen: message.screen,
        ...message.data,
      },
      isNil
    ),
    android: {
      priority: message.priority || 'high',
    },
  };

  return finalPayload;
};

/**
 * @typedef {object} PushOptions
 * @property {string} token
 * @property {string[]} tokens
 * @property {string} title
 * @property {string} [content]
 * @property {string} [imageUrl]
 * @property {string} [priority=high]
 * @property {string} [screen]
 * @property {string} [url]
 * @property {object} [data]
 */

/**
 * @param {PushOptions|PushOptions[]} options
 */
export const sendPush = async (options) => {
  if (Array.isArray(options)) {
    const payload = options.map((message) =>
      Object.assign(formatMessage(message), {
        token: message.token,
      })
    );

    return firebase
      .messaging()
      .sendAll(payload)
      .then((res) => [null, res])
      .catch((err) => [err, null]);
  }

  const payload = formatMessage(options);
  const tokens =
    typeof options.token === 'string' ? [options.token] : options.tokens;

  return firebase
    .messaging()
    .sendMulticast({
      tokens,
      ...payload,
    })
    .then((res) => [null, res])
    .catch((err) => [err, null]);
};
