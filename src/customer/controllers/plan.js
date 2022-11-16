import { Plan } from '../../models/index.js';
import { getCalculation } from '../../services/application.js';
import { getGoldPrice } from '../../services/ecom.js';
import APIError from '../../utils/error.js';
import roundValue from '../../utils/roundValue.js';

export const getPlans = async (req, res) => {
  const [planBonus, gst] = await getCalculation(['plan_bonus', 'buy_gold_gst']);
  const filter = { type: req.query.type ?? 'standard' };

  const [data, goldPrice] = await Promise.all([
    Plan.find(filter).lean().populate('cyclePeriod'),
    getGoldPrice(),
  ]);

  res.json(
    data.map((item) => {
      const goldSaving = roundValue(
        (item.min * item.duration) /
          (item.mode === 'weight' ? 1 : goldPrice.buyPrice * (1 + gst / 100)),
        3
      );
      const bonus = roundValue(goldSaving * (planBonus / 100), 3);

      return {
        id: item.id,
        mode: item.mode,
        duration: item.duration,
        cyclePeriod: item.cyclePeriod,
        min: item.min,
        approximateWeight: roundValue(goldSaving + bonus, 3),
      };
    })
  );
};

export const getPlanById = async (req, res) => {
  const [planBonus, gst] = await getCalculation(['plan_bonus', 'buy_gold_gst']);
  const [data, goldPrice] = await Promise.all([
    Plan.findById(req.params.id).lean().populate('cyclePeriod'),
    getGoldPrice(),
  ]);

  if (!data)
    throw new APIError('plan does not exist', APIError.RESOURCE_NOT_FOUND, 404);

  const goldSaving = roundValue(
    (data.min * data.duration) /
      (data.mode === 'weight' ? 1 : goldPrice.buyPrice * (1 + gst / 100)),
    3
  );
  const bonus = roundValue(goldSaving * (planBonus / 100), 3);

  res.json({
    id: data.id,
    mode: data.mode,
    duration: data.duration,
    cyclePeriod: data.cyclePeriod,
    min: data.min,
    approximateWeight: roundValue(goldSaving + bonus, 3),
  });
};
