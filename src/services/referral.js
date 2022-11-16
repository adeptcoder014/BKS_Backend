import cryptoRandomString from 'crypto-random-string';
import Referral from '../models/referral.js';
import ReferralType from '../models/referralType.js';

export const generateReferralCode = (fullName) => {
  const first = fullName.replaceAll(' ', '').substring(0, 4).toUpperCase();
  const second = cryptoRandomString({
    characters: 'ABCDEFGHIJKLMNPRSTUVWXYZ',
    length: 2,
  });
  const third = cryptoRandomString({ type: 'numeric', length: 2 });

  return first + second + third;
};

export const createReferral = async (userId, fullName, retry = 3) => {
  try {
    const type = await ReferralType.findOne({ userType: 'customer' }).lean();
    if (!type) throw new Error('Referral type `customer` does not exist');

    const referral = await Referral.create({
      type: type.id,
      user: userId,
      code: generateReferralCode(fullName),
    });
    return referral;
  } catch (err) {
    if (retry === 0) throw err;
    return createReferral(userId, fullName, retry - 1);
  }
};

export const processReferral = async (userId, code) => {
  const referral = await Referral.findOne({ code }).lean();
  if (!referral) return;

  await ReferredUser.create({
    referralId: referral.id,
    referredBy: referral.user,
    user: userId,
  });
};
