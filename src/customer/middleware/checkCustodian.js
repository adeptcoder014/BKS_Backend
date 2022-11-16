import APIError from '../../utils/error.js';

export default function checkCustodian(req, res, next) {
  if (!req.user.selectedMerchant) {
    throw new APIError(
      'please choose a custodian',
      APIError.CUSTODIAN_NOT_SELECTED
    );
  }

  next();
}
