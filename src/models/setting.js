import mongoose from 'mongoose';
import { getS3Url } from '../services/s3.js';

const schema = new mongoose.Schema(
  {
    organizationName: String,
    organizationLogo: { type: String, get: getS3Url },
    organizationGST: String,
    organizationCIN: String,
    organizationAddress: String,
    organizationSignature: { type: String, get: getS3Url },
    organizationAccount: {
      holderName: String,
      bankName: String,
      accountNo: String,
      ifsc: String,
      branch: String,
    },
    appBackgroundColor: String,
    appPrimaryColor: String,
    appSecondaryColor: String,
    appTextColor: String,
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model('setting', schema);

export default Setting;
