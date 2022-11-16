// @ts-check
import {
  verifyAadhaar,
  verifyBankAccount,
  verifyGST,
  verifyPan,
} from './services/sandbox.js';
import fs from 'fs';
import ejs from 'ejs';
import path from 'path';
import conversion from 'phantom-html-to-pdf';
import dayjs from 'dayjs';
import {
  convertCurrency,
  parseTemplate,
  stringToObjectId,
} from './utils/util.js';
import { generateInvoice } from './services/pdf.js';
import redis from './services/redis.js';
import queue from './services/queue.js';
import Merchant from './models/merchant.js';

// generateInvoice('invoices/sale', {
//   invoiceId: 1234,
//   merchant: {
//     name: 'B K SARAF PRIVATE LIMITED',
//     address: 'M13 Gole Market, Mahanagar, Lucknow, Uttar Pradesh - 576219',
//     pan: 'BHRPY0673E',
//     gstin: 'BNSSKSJSJSJSJS',
//     cin: '111111',
//   },
//   billTo: {
//     name: 'Yuva',
//     mobile: '8277314517',
//     email: 'yuva@gmail.com',
//   },
//   items: [
//     {
//       description: '24KT Gold',
//       hsn: '12222222s',
//       quantity: 2,
//       rate: 5500,
//       amount: 11000,
//     },
//   ],
//   taxAmount: 500.82,
//   totalAmount: 11500.82,
//   totalAmountInWords: convertCurrency(11500.82),
//   paymentId: 'RZ_11111',
//   paymentMode: 'UPI',
//   createdAt: dayjs().format('DD/MM/YYYY'),
// })
// .then(console.log)
// }).then((html) => {
//   conversion()(
//     {
//       html,
//       paperSize: {
//         format: 'A4',
//         height: '50%',
//       },
//     },
//     function (err, pdf) {
//       const output = fs.createWriteStream('./release-custody.pdf');
//       console.log('------->', pdf.logs);
//       console.log('page no.---', pdf.numberOfPages);
//       pdf.stream.pipe(output);
//     }
//   );
// })

//let a = { b: 5 };
let a = 6;

console.log(typeof stringToObjectId());
