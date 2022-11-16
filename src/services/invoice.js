import fs from 'fs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { getImages } from './application.js';
import { uploadFile, uploadStream } from './s3.js';

export function generateInvoicePdf(data) {
  const { billFrom, billTo } = data;
  let doc = new PDFDocument({ size: 'A4', margin: 50 });

  generateHeader(doc);
  generateMerchantInformation();
  generateCustomerInformation(doc, data);
  generateInvoiceTable(doc, data);
  generateFooter(doc);

  doc.end();

  function generateHeader(doc) {
    doc
      .image(getImages().logo, 30, 10, { width: 80 })
      .fillColor('black')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Original - Customer Copy', 10, 50, {
        align: 'right',
      })
      .moveDown();
    generateHr(doc, 80, 'grey');

    doc.fillColor('#444444').fontSize(20).text('Invoice', 50, 100);
  }

  function generateMerchantInformation() {
    doc

      .fontSize(12)
      .font('Helvetica-Bold')
      .text(billFrom.name, 50, 125, {})
      .font('Helvetica')
      .fontSize(10)
      .text(billFrom.address, 50, 140);

    doc
      .text(`PAN No: ${billFrom.pan}`, 10, 125, { align: 'right' })
      .text(`GSTIN: ${billFrom.gst}`, { align: 'right' })
      .text(`CIN NO: ${billFrom.cin}`, { align: 'right' });
  }

  function generateCustomerInformation(doc, data) {
    const top = 180;

    generateHr(doc, 170);

    doc
      .text('Date:', 50, top)
      .text(dayjs(data.date).format('DD/MM/YYYY'), 50, top + 10);

    doc
      .text('Order No: ', 50, top, { align: 'right' })
      .text(data.orderId, 50, top + 10, { align: 'right' });

    generateHr(doc, top + 40);

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Bill To, ', 50, top + 60)
      .fontSize(12)
      .font('Helvetica')
      .text(`Name : ${billTo.name}`, 50, top + 80)
      .text(`Phone Number : ${billTo.mobile}`, 50, top + 95)
      .text(`Email : ${billTo.email}`, 50, top + 110);
  }

  function generateInvoiceTable(doc, data) {
    let i;
    const invoiceTableTop = 330;

    doc.font('Helvetica-Bold');
    generateTableRow(
      doc,
      invoiceTableTop,
      'Description',
      'Grams',
      'Rate Per Gram',
      'Total Amount'
    );
    generateHr(doc, invoiceTableTop + 20);

    doc.font('Helvetica');

    for (i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const position = invoiceTableTop + (i + 1) * 30;
      generateTableRow(
        doc,
        position,
        item.description,
        item.quantity,
        item.rate,
        item.amount
      );

      generateHr(doc, position + 20);
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    generateTableRow(doc, subtotalPosition, '', '', 'Applied Tax', '');

    const paidToDatePosition = subtotalPosition + 20;
    generateTableRow(doc, paidToDatePosition, '', '', data.gst, data.taxAmount);

    const duePosition = paidToDatePosition + 25;
    generateTableRow(
      doc,
      duePosition,
      '',
      '',
      'Total Amount',
      data.totalAmount
    );
    doc.font('Helvetica');
  }

  function generateFooter(doc) {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Declaration :', 50, 600)
      .fontSize(10)
      .font('Helvetica')
      .text(
        'We declare that the above quantity of goods are kept by the seller in a safe vault on behalf of the buyer. It can be delivered in minted product as per the Terms & Conditions.'
      );

    doc.image(getImages().signature, 50, 700, { width: 80, height: 50 });
    doc.text('Authorized Signature', null, 750, { align: 'right' });
  }

  function generateTableRow(doc, y, description, grams, rate, total) {
    doc
      .fontSize(10)
      .text(description, 50, y)
      .text(grams, 250, y)
      .text(`${rate}`, 280, y, { width: 150, align: 'right' })
      .text(total, 450, y, { width: 90, align: 'right' });
  }

  function generateHr(doc, y, color = '#aaaaaa') {
    doc.strokeColor(color).lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
  }

  return uploadStream(doc, 'application/pdf');
}
