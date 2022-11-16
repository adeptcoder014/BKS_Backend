const validate = (schema, options = {}) => {
  return (req, res, next) => {
    const { value, error } = schema.validate(
      options?.field ? req[options.field] : req.body,
      {
        abortEarly: false,
        allow: '',
        allowUnknown: true,
        stripUnknown: false,
        errors: {
          wrap: {
            label: '',
          },
        },
        ...options,
      }
    );

    if (error) {
      const errors = error.details.reduce(
        (prev, cur) => ({
          ...prev,
          [cur.context.key || 'error']: cur.message,
        }),
        {}
      );
      errors.error = error.message;
      console.error(errors);
      return res.status(422).json({
        message: error.message,
        errors,
      });
    }

    req.body = value;
    next();
  };
};

export default validate;
