import joi from 'joi';

const create = joi.object({
  name: joi.string().required(),
});

const update = joi.object({
  name: joi.string().required(),
});

export default {
  create,
  update,
};
