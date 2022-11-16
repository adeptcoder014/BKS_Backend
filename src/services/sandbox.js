import axios from 'axios';
import dayjs from 'dayjs';
import APIError from '../utils/error.js';
import logger from '../utils/logger.js';

const apiUrl = process.env.SANDBOX_API_URL;
const apiKey = process.env.SANDBOX_API_KEY;
const apiSecret = process.env.SANDBOX_API_SECRET;
const apiVersion = '1.0';

const authentication = {
  accessToken: null,
  expiryDate: null,
};

const instance = axios.create({
  baseURL: apiUrl,
  headers: {
    'x-api-version': apiVersion,
    'content-type': 'application/json',
  },
});

const getAccessToken = async () => {
  if (
    authentication.accessToken &&
    dayjs().isBefore(authentication.expiryDate)
  ) {
    return authentication.accessToken;
  }

  try {
    const response = await instance({
      url: '/authenticate',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
      },
    });
    Object.assign(authentication, {
      accessToken: response.data.access_token,
      expiryDate: dayjs().add(23, 'hour'),
    });
    return response.data.access_token;
  } catch (err) {
    logger.error(err.response.data);
    throw new Error('Unable to authenticate with sandbox api');
  }
};

const request = async (path, config) => {
  const accessToken = await getAccessToken();
  return instance({
    url: path,
    method: 'GET',
    data: {},
    headers: {
      Authorization: accessToken,
      'x-api-key': apiKey,
    },
    ...config,
  })
    .then((res) => res.data)
    .catch((err) => {
      if (err.response.status === 401) {
        Object.assign(authentication, { accessToken: null, expiryDate: null });
        return request(path, config);
      }
      console.error(err);
      return Promise.reject({
        status: err.response.status,
        ...err.response.data,
      });
    });
};

export const verifyPan = async (fullName, panNo) => {
  try {
    const data = await request(
      `/pans/${panNo}/verify?consent=y&reason=For KYC of User`
    );
    if (data.data?.status === 'VALID') {
      if (
        data.data.full_name.toLowerCase().indexOf(fullName.toLowerCase()) !== -1
      )
        return [null, data.data];
      return ['Pan number is mismatching with the name', null];
    }
    return ['Invalid pan number', null];
  } catch (err) {
    if (err.code === 422) {
      return [err.message, null];
    }
    return [err.message, null];
  }
};

export const verifyAadhaar = async (aadhaar) => {
  try {
    const data = await request(
      `/aadhaar/verify?consent=y&reason=For KYC Of User`,
      {
        method: 'POST',
        data: {
          aadhaar_number: aadhaar,
        },
      }
    );
    if (data.data?.aadhaar_exists) return [null, data.data];
    return ['Invalid aadhaar number', null];
  } catch (err) {
    if (err.status === 422) {
      return [err.data, null];
    }
    console.error(err);
    return ['Unable to verify aadhaar, please try again later', null];
  }
};

export const verifyIfsc = async (ifsc) => {
  return request(`/bank/${ifsc}`)
    .then((res) => ({
      bank: res.BANK,
      ifsc: res.IFSC,
      micr: res.MICR,
      branch: res.BRANCH,
      address: res.ADDRESS,
      city: res.CITY,
      state: res.STATE,
      contact: res.CONTACT,
    }))
    .catch((err) => {
      switch (err.status) {
        case 404:
          throw new APIError('Invalid ifsc code', APIError.INVALID_IFSC_CODE);
        default:
          throw new APIError(
            'Unable to validate bank details, please try again later'
          );
      }
    });
};

export const verifyBankAccount = async (accountNo, ifsc) => {
  return request(`/bank/${ifsc}/accounts/${accountNo}/verify`)
    .then((res) => {
      switch (res.data?.account_exists) {
        case true:
          return res.data?.name_at_bank || '';
        case false:
          throw new APIError(
            'Invalid bank account number',
            APIError.INVALID_ACCOUNT_NO
          );
        default:
          throw Error('Unknown error occurred while verifying bank details');
      }
    })
    .catch((err) => {
      switch (err.status) {
        case 422:
          throw new APIError(
            'Invalid bank account number',
            APIError.INVALID_ACCOUNT_NO
          );
        default:
          console.error(err);
          throw new APIError(
            'Unable to verify bank details, please try again later'
          );
      }
    });
};

export const verifyGST = async (gstNo, businessName) => {
  return request(`/gsp/public/gstin/${gstNo}`)
    .then((res) => {
      switch (res.data.error_code) {
        case 'SWEB_9035':
          throw new APIError('Invalid gst number', APIError.INVALID_GST_NO);
        case 'NOGSTIN':
        case 'FO8000':
          throw new APIError(
            'Gst registration not found',
            APIError.GST_NOT_FOUND
          );
        default:
          const data = {
            name: res.data.tradeNam,
            legalName: res.data.lgnm,
            type: res.data.ctb,
            registeredAt: res.data.rgdt,
            address: `${res.data.pradr?.addr.bno} ${res.data.pradr?.addr.st}, ${res.data.pradr?.addr.loc}, ${res.data.pradr?.addr.dst}, ${res.data.pradr?.addr.stcd} - ${res.data.pradr?.addr.pncd}`,
            landmark: res.data.pradr?.addr.st,
            pincode: res.data.pradr?.addr.pncd,
            state: res.data.pradr?.addr.stcd,
          };

          if (
            data.legalName?.toLowerCase() !== businessName?.toLowerCase() &&
            businessName
          ) {
            throw new APIError(
              'Business name does not matched with gst',
              APIError.GST_MISMATCH_NAME
            );
          }

          return data;
      }
    })
    .catch((err) => {
      if (err instanceof APIError) throw err;
      console.error(err);
      switch (err.code) {
        case 422:
          throw new APIError(
            'Gst registration not found',
            APIError.GST_NOT_FOUND
          );
        default:
          logger.error(err);
          throw new APIError(
            'Unable to verify gst number, please try again later'
          );
      }
    });
};

export const getCompanyDetails = async (id) => {
  return request(`/mca/companies/${id}`)
    .then((res) => {
      const data = res.data.company_master_data;

      return {
        id,
        name: data.company_name,
        email: data.email_id,
        class: data.class_of_company,
        address: data.registered_address,
      };
    })
    .catch((err) => {
      if (err.code === 422) {
        throw new APIError('Invalid company id', APIError.INVALID_COMPANY_ID);
      }
      console.error(err);
      throw new APIError('Unable to verify company, please try again later');
    });
};
