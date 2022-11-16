import PDFDocument from 'pdfkit-table';
import phantom from 'phantom-html-to-pdf';
import { parseTemplate } from '../utils/util.js';
import { getSettings } from './application.js';
import { uploadStream } from './s3.js';

const convertToPDF = phantom();

export const generateTable = (options) => {
  const {
    title = 'Reports',
    padding = 2,
    headerColor = '#0061FF',
    headers,
    data,
  } = options;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const table = {
    title: { label: title, fontSize: 20 },
    headers: headers.map((item) => ({
      headerColor,
      headerOpacity: 1,
      ...item,
    })),
    datas: data,
  };

  doc.table(table, {
    padding,
    prepareHeader: () =>
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white'),
    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
      doc.font('Helvetica').fontSize(8).fillColor('black');
    },
  });

  doc.end();

  return doc;
};

export const generateInvoice = async (template, data) => {
  const settings = getSettings();

  const html = await parseTemplate(`src/views/${template}.html`, {
    logo: settings.organizationLogo,
    signature: settings.organizationSignature,
    ...data,
  });

  return new Promise((resolve, reject) => {
    convertToPDF(
      {
        html,
        paperSize: {
          format: 'A4',
          height: '50%',
        },
      },
      (err, pdf) => {
        if (err) return reject(err);
        resolve(uploadStream(pdf.stream, 'application/pdf'));
      }
    );
  });
};
