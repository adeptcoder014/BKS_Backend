import Model from '../../models/calculation.js';

export const getList = async (req, res) => {
  const data = await Model.paginate(
    req.body.filter || {},
    req.body.options || {}
  );
  res.json(data);
};

export const create = async (req, res) => {
  const data = new Model(req.body);

  await data.save();

  res.status(201).json(data);
};

export const getOneById = async (req, res) => {
  const data = await Model.findById(req.params.id);
  if (!data)
    return res.status(404).json({
      message: 'document not found',
    });

  res.json(data.toJSON());
};

export const updateOneById = async (req, res) => {
  const data = await Model.findById(req.params.id);
  if (!data)
    return res.status(404).json({
      message: 'document not found',
    });

  Object.assign(data, req.body);

  await data.save();

  res.json(data.toJSON());
};

export const deleteOneById = async (req, res) => {
  const data = await Model.findById(req.params.id);
  if (!data)
    return res.status(404).json({
      message: 'document not found',
    });

  await data.remove();

  res.sendStatus(204);
};
