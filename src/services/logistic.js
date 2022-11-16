import dayjs from 'dayjs';
import axios from '../utils/axios.js';
import APIError from '../utils/error.js';
import roundValue from '../utils/roundValue.js';

const apiUrl = process.env.SEQUEL_API_URL;
const apiToken = process.env.SEQUEL_API_TOKEN;
const storeCode = process.env.SEQUEL_STORE_CODE;

export const createShipment = async ({
  fromAddress,
  toAddress,
  netWeight,
  netValue,
  packageCount = 1,
}) => {
  try {
    const shipment = await axios.post(`${apiUrl}/api/shipment/create`, {
      token: apiToken,
      location: 'domestic',
      shipmentType: 'D&J',
      serviceType: 'valuable',
      fromStoreCode:
        typeof fromAddress === 'string'
          ? fromAddress
          : {
              consignee_name: fromAddress.fullName,
              address_line1: fromAddress.fullAddress,
              pinCode: `${fromAddress.pincode}`,
              auth_receiver_name: fromAddress.fullName,
              auth_receiver_phone: fromAddress.mobile,
            },
      toAddress:
        typeof toAddress === 'string'
          ? toAddress
          : {
              consignee_name: toAddress.fullName,
              address_line1: toAddress.fullAddress,
              pinCode: `${toAddress.pincode}`,
              auth_receiver_name: toAddress.fullName,
              auth_receiver_phone: toAddress.mobile,
            },
      net_weight: `${netWeight}`,
      net_value: `${roundValue(netValue, 0)}`,
      no_of_packages: `${packageCount}`,
    });
    console.log(shipment);
    switch (shipment.status) {
      case 'true':
        return {
          docketNo: shipment.data.docket_number,
          brnNo: shipment.data.brn,
          estimatedDeliveryDate: dayjs(
            shipment.data.estiimated_delivery,
            'DD-MM-YYYY'
          ).toDate(),
          trackingUrl: `${process.env.SEQUEL_API_URL}/track/${shipment.data.docket_number}`,
        };
      case 'false':
        console.error(shipment);
        throw new APIError(
          'Invalid request data',
          APIError.SHIPMENT_INVALID_REQUEST
        );
    }
  } catch (err) {
    console.error(err);
    throw new APIError(
      'Unable to upload order due to shipment server issue, try again later',
      APIError.SHIPMENT_SERVER_ERROR
    );
  }
};

export const cancelShipment = async (docketNo) => {};

export const getDeliveryStatus = async (origin, destination) => {
  const data = await axios.post(`${apiUrl}/api/shipment/calculateEDD`, {
    token: apiToken,
    origin_pincode: origin.toString(),
    destination_pincode: destination.toString(),
    pickup_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  });

  const etd = dayjs(data.data?.estimated_delivery, 'DD-MM-YYYY');

  return {
    available: data.status === 'true',
    estimatedDeliveryDate: etd.isValid() ? etd.toDate() : '',
    shippingAmount: 700,
  };
};

export const isPincodeServiceable = async (code) => {
  return [];
};
