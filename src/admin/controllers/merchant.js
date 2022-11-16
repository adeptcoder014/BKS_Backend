import Model from '../../models/merchant.js';
import { verifyGST } from '../../services/sandbox.js';

export const getGstInfo = async (req, res) => {
  const data = await verifyGST(req.params.gstNo);
  res.json(data);
};

export const getList = async (req, res) => {
  const data = await Model.paginate(
    req.body.filter || {},
    req.body.options || {}
  );
  res.json(data);
};

export const create = async (req, res) => {
  const data = new Model({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    aadhaar: req.body.aadhaar,
    pan: req.body.pan,
    gstNo: req.body.gstNo,
    address: req.body.address,
    location: {
      type: 'Point',
      coordinates: req.body.location,
    },
    retainershipType: req.body.retainershipType,
    retainershipValue: req.body.retainershipValue,
    commission: req.body.commission,
    modules: req.body.modules,
    settlementInDays: req.body.settlementInDays,
    limit: req.body.limit,
    eInvoiceApplicable: req.body.eInvoiceApplicable,
  });

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

  if (req.body.location) {
    data.location.coordinates = req.body.location.reverse();
  }

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
