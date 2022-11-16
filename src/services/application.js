import isNil from 'lodash/isNaN.js';
import axios from 'axios';
import { Calculation, Setting } from '../models/index.js';
import { legacyCalculationNames } from '../utils/constants.js';
import * as redis from './redis.js';

const images = {};

export const loadApplicationData = async () => {
  const calculations = await Calculation.find().lean();
  const settings = await Setting.findOne().lean({ getters: true });

  await redis.storeKey('calculations', calculations);
  await redis.storeKey('settings', settings || {});
  await loadImages(settings);
};

export const loadImages = async (settings) => {
  const logo = (
    await axios.get(settings.organizationLogo, {
      responseType: 'arraybuffer',
    })
  ).data;
  const signature = (
    await axios.get(settings.organizationSignature, {
      responseType: 'arraybuffer',
    })
  ).data;

  images.logo = logo;
  images.signature = signature;
};

export const getImages = () => images;

export const getCalculation = async (name) => {
  const data = await redis.getKey('calculations', true);

  if (Array.isArray(name)) {
    const values = name.map((item) => {
      const value = data.find(
        (e) => e.name === item || e.name === legacyCalculationNames[item]
      )?.value;
      if (isNil(value)) throw new Error(`Calculation:[${item}] does not exist`);

      return value;
    });
    return values;
  }

  const value = data.find(
    (item) => item.name === name || item.name === legacyCalculationNames[name]
  )?.value;
  if (isNil(value)) throw new Error(`Calculation:[${name}] does not exist`);

  return value;
};

export const getSettings = async () => {
  const data = await redis.getKey('settings', true);
  return data;
};
