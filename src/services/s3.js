import dotenv from 'dotenv';
import stream from 'stream';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import cryptoRandomString from 'crypto-random-string';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

export const getS3Url = (key) => {
  if (!key) return '';
  if (Array.isArray(key)) {
    return key.map(getS3Url);
  }
  return `${process.env.AWS_BUCKET_URL}/${key}`;
};

export const getS3KeyFromUrl = (url) => {
  if (!url) return '';
  return url.replace(`${process.env.AWS_BUCKET_URL}/`, '');
};

export const uploadFile = async (buffer, contentType) => {
  const key = cryptoRandomString({
    type: 'hex',
    length: 25,
  });

  await s3.send(
    new PutObjectCommand({
      Body: buffer,
      Bucket: process.env.AWS_BUCKET_NAME,
      ACL: 'public-read',
      Key: key,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: getS3Url(key),
  };
};

export const uploadStream = async (doc, contentType) => {
  const pass = new stream.PassThrough();
  doc.pipe(pass);

  const randomId = cryptoRandomString({
    type: 'hex',
    length: 25,
  });
  const key = `invoices/${randomId}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: pass,
      ACL: 'public-read',
      ContentType: contentType,
    },
  });

  await upload.done();

  return {
    key,
    url: getS3Url(key),
  };
};

export const createPreSignedUrl = async (contentType) => {
  const key = cryptoRandomString({
    type: 'hex',
    length: 25,
  });
  const command = new PutObjectCommand({
    Key: key,
    ACL: 'public-read',
    Bucket: process.env.AWS_BUCKET_NAME,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command);

  return {
    key: key,
    url: getS3Url(key),
    uploadUrl: url,
  };
};

export default s3;
