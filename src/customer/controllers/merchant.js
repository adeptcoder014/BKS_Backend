import User from '../../models/user.js';
import Merchant from '../../models/merchant.js';
import APIError from '../../utils/error.js';

export const getMerchants = async (req, res) => {
  const data = await Merchant.find({
    isVerified: true,
    modules: req.query.modules || 'custodian',
  })
    .lean({ getters: true })
    .select('name image');

  res.json(
    data.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      isSelected: req.user.selectedMerchant?.equals?.(item.id) ?? false,
    }))
  );
};

export const getMerchantById = async (req, res) => {
  const data = await Merchant.findById(req.params.id).lean({ getters: true });
  if (!data) throw new APIError(APIError.RESOURCE_NOT_FOUND, 404);

  res.json({
    id: data.id,
    name: data.name,
    image: data.image,
    isSelected: req.user.selectedMerchant?.equals(data.id) ?? false,
  });
};

export const getSelectedMerchant = async (req, res) => {
  if (!req.user.selectedMerchant)
    return res.json({
      selected: false,
      data: null,
    });

  const data = await Merchant.findById(req.user.selectedMerchant);
  if (!data || !data.isVerified || !data.modules.includes('custodian')) {
    return res.json({
      selected: false,
      data: null,
    });
  }

  res.json({
    selected: true,
    data: {
      id: data.id,
      name: data.name,
      image: data.image,
    },
  });
};

export const selectMerchant = async (req, res) => {
  const data = await Merchant.findById(req.params.id).lean();
  if (!data) throw new APIError(APIError.RESOURCE_NOT_FOUND, 404);
  if (!data.modules.includes('custodian'))
    throw new APIError('invalid merchant');

  await User.updateOne({ _id: req.user.id }, { selectedMerchant: data.id });

  res.status(201).json({
    message: 'success',
  });
};
