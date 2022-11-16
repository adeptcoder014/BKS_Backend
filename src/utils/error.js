export default class APIError extends Error {
  constructor(message, errorCode, statusCode = 400, data) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.data = data || {};
  }

  toJSON() {
    return {
      message: this.message,
      status: this.statusCode,
      code: this.errorCode,
      ...this.data,
    };
  }

  // common
  static RESOURCE_NOT_FOUND = 1000;
  static INTERNAL_SERVER_ERROR = 1001;
  static RATE_LIMITED = 1002;
  static TOKEN_EXPIRED = 1003;
  static INVALID_OTP = 1004;
  static INVALID_MPIN = 1005;
  static INVALID_GST_NO = 1006;
  static INVALID_PAN_NO = 1007;
  static INVALID_AADHAAR_NO = 1008;
  static INVALID_ACCOUNT_NO = 1009;
  static INVALID_PINCODE = 1010;
  static INVALID_IFSC_CODE = 1011;
  static INVALID_COMPANY_ID = 1012;

  static PROFILE_ALREADY_CREATED = 1100;
  static PHONE_NOT_REGISTERED = 1101;
  static PHONE_ALREADY_REGISTERED = 1102;
  static PINCODE_NOT_SERVICEABLE = 1111;
  static INSUFFICIENT_GOLD_BALANCE = 1112;
  static GST_NOT_FOUND = 1113;
  static ACCOUNT_NOT_VERIFIED = 1114;
  static CUSTODIAN_NOT_SELECTED = 1115;

  static GST_MISMATCH_NAME = 1120;
  static PAN_MISMATCH_NAME = 1121;
  static AADHAAR_MISMATCH_NAME = 1122;
  static ACCOUNT_MISMATCH_NAME = 1123;

  // order
  static ORDER_ALREADY_PACKED = 1200;
  static ORDER_ALREADY_SHIPPED = 1201;
  static ORDER_ALREADY_HAND_OVERED = 1203;
  static SHIPMENT_SERVER_ERROR = 1204;
  static SHIPMENT_INVALID_REQUEST = 1205;
  static CANNOT_CANCEL_ORDER = 1206;
  static CANNOT_RETURN_ORDER = 1207;
}
