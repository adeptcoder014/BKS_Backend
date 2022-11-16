import Model from '../../models/setting.js';

export const getOneById = async (req, res) => {
  const data = await Model.findOne();

  res.json(data);
};

export const update = async (req, res) => {
  const data = await Model.findOne();

  Object.assign(data, req.body);

  await data.save();

  res.json(data);
};
