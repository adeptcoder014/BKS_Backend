import multer from 'multer';
import cryptoRandomString from 'crypto-random-string';
import multerS3 from 'multer-s3';
import s3 from '../services/s3.js';
import APIError from './error.js';

const  fileupload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, cryptoRandomString({ type: 'hex', length: 25 }));
    },
  }),
});

const _middleware = (req, next) => (err) => {
  if (err) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new APIError(`Unexpected field: ${err.field}`));
    }
    return next(err);
  }

  if (req.file) {
    req.body[req.file.fieldname] = req.file.key;
  }

  if (req.files) {
    for (const file in req.files) {
      req.body[file] = req.files[file][0].key;
    }
  }

  if (req.body.payload_json) {
    Object.assign(req.body, JSON.parse(req.body.payload_json));
  }

  next();
};

fileupload.auto = (fields) => (req, res, next) => {
  if (Array.isArray(fields)) {
    fileupload.fields(fields.map((item) => ({ name: item, maxCount: 1 })))(
      req,
      res,
      _middleware(req, next)
    );
    return;
  }

  fileupload.single(fields)(req, res, _middleware(req, next));
};

export default fileupload;
