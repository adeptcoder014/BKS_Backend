const transform = (doc, opt) => {
  if (!doc) return;

  if (typeof opt === 'number') {
    doc.id = doc._id ?? doc.id;
    delete doc._id;
    delete doc.__v;
    doc._id = doc.id;
    return;
  }

  if (doc._id != null) {
    doc.id = doc._id;
    delete doc._id;
  }
  delete doc.__v;

  for (const key of Object.keys(doc)) {
    if (doc[key] != null && doc[key].constructor.name === 'Object') {
      transform(doc[key]);
    } else if (Array.isArray(doc[key])) {
      for (const el of doc[key]) {
        if (el != null && el.constructor.name === 'Object') {
          transform(el);
        }
      }
    }
  }
};

export default function leanTransform(schema) {
  schema.set('minimize', false);

  schema.post(['find', 'findOne', 'findOneAndUpdate'], function (res) {
    if (!res || !this.mongooseOptions().lean) return;

    if (Array.isArray(res)) {
      res.forEach(transform);
      return;
    }
    transform(res);
  });
}
