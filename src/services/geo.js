import roundValue from '../utils/roundValue.js';

export const calculateDistance = async (from, to, unit = 'km') => {
  const [latitude1, longitude1] = from;
  const [latitude2, longitude2] = to;

  const earthRadius = 6371;
  const latDistance = ((latitude2 - latitude1) * Math.PI) / 180;
  const lonDistance = ((longitude2 - longitude1) * Math.PI) / 180;
  const value =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos((latitude1 * Math.PI) / 180) *
      Math.cos((latitude2 * Math.PI) / 180) *
      Math.sin(lonDistance / 2) *
      Math.sin(lonDistance / 2);

  let distance =
    2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * earthRadius;

  switch (unit) {
    case 'm':
      distance = roundValue(distance * 1000, 0);
      break;
    case 'km':
      distance = roundValue(distance, 1);
  }

  return distance;
};
