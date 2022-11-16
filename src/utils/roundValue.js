export default function roundValue(value, decimals = 2) {
  return +(Math.round(value + `e+${decimals}`) + `e-${decimals}`);
}
