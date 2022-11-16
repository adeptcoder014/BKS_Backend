export const Apps = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  BUSINESS: 'business',
  CAPTAIN: 'captain',
};

export const userTypes = {
  CUSTOMER: 1,
  ADMIN: 2,
};

export const orderStatus = {
  Placed: 'placed',
  assigned: 'assigned',
  packed: 'packed',
  inTransit: 'inTransit',
};

export const legacyCalculationNames = {
  buy_gold_gst: 'BuyGold GST',
  sell_gold_gst: 'SellGold GST',
  gst: 'gst',
  making_charge: 'MakingCharge',
  plan_bonus: 'Plan Bonus',
  hold: 'Hold',
  handling_charge: 'HandlingCharge',
  bank_commission: 'Bank Commission',
  declaration_tax: 'Declaration Tax',
};

export const MODULE = {
  INSTANT: 'instant',
  BUY_SAVE: 'buy_save',
  SELL_RESERVE: 'sell_reserve',
  BUY_RESERVE: 'buy_reserve',
  ECOM: 'ecom',
  SELL_OLD_GOLD: 'sell_old_gold',
  UPLOAD_OLD_GOLD: 'upload_old_gold',
  UPI: 'upi',
};

export const ACTION = {
  BUY_GOLD: 'buy_gold',
  SELL_GOLD: 'sell_gold',
  RESERVE_GOLD: 'reserve_gold',
  BUY_RESERVED: 'buy_reserved',
  SUBSCRIPTION_INITIATE: 'subscription_initiate',
  SUBSCRIPTION_INSTALLMENT: 'subscription_installment',
};

export const CUSTODY_TYPE = {
  GIVEN: 'given',
  RELEASE: 'release',
};

export const TRANSACTION_TYPE = {
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SETTLED: 'settled',
};

export const SUBSCRIPTION_CYCLE = {
  1: 'day',
  7: 'week',
  30: 'month',
  365: 'year',
};
