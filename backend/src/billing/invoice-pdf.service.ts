import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoicePdfData {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicGst?: string;
  invoiceCode: string;
  date: string;
  status: string;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  patientAddress?: string;
  doctorName?: string;
  items: {
    description: string;
    itemType: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
  }[];
  subTotal: number;
  discountAmount: number;
  discountReason?: string;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  payments: {
    amount: number;
    method: string;
    date: string;
    ref?: string;
  }[];
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Ewa Derma Theme Palette
    const primaryPurple = rgb(91 / 255, 33 / 255, 182 / 255); // #5B21B6
    const accentGold = rgb(201 / 255, 162 / 255, 75 / 255);   // #C9A24B
    const textDark = rgb(27 / 255, 38 / 255, 59 / 255);
    const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);
    const surfaceGray = rgb(247 / 255, 248 / 255, 250 / 255);
    const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);
    const successGreen = rgb(16 / 255, 185 / 255, 129 / 255);

    // 1. HEADER BANNER
    const headerHeight = 90;
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width,
      height: headerHeight,
      color: primaryPurple,
    });

    // Gold stripe underneath header
    page.drawRectangle({
      x: 0,
      y: height - headerHeight - 4,
      width,
      height: 4,
      color: accentGold,
    });

    // Clinic Title
    page.drawText(data.clinicName.toUpperCase(), {
      x: 35,
      y: height - 35,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(data.clinicAddress, {
      x: 35,
      y: height - 52,
      size: 9,
      font: fontRegular,
      color: rgb(235 / 255, 230 / 255, 255 / 255),
    });

    page.drawText(`Phone: ${data.clinicPhone} ${data.clinicGst ? `| GSTIN: ${data.clinicGst}` : ''}`, {
      x: 35,
      y: height - 67,
      size: 9,
      font: fontRegular,
      color: rgb(235 / 255, 230 / 255, 255 / 255),
    });

    // Invoice Title & Code Right Aligned
    page.drawText('INVOICE / RECEIPT', {
      x: width - 180,
      y: height - 35,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(data.invoiceCode, {
      x: width - 180,
      y: height - 52,
      size: 12,
      font: fontBold,
      color: accentGold,
    });

    page.drawText(`Date: ${data.date}`, {
      x: width - 180,
      y: height - 67,
      size: 9,
      font: fontRegular,
      color: rgb(235 / 255, 230 / 255, 255 / 255),
    });

    let currentY = height - headerHeight - 30;

    // 2. PATIENT & INVOICE DETAILS CARD
    page.drawRectangle({
      x: 35,
      y: currentY - 55,
      width: width - 70,
      height: 60,
      color: surfaceGray,
      borderColor: borderGray,
      borderWidth: 1,
    });

    // Patient Column
    page.drawText('BILLED TO:', {
      x: 45,
      y: currentY - 12,
      size: 8,
      font: fontBold,
      color: textMuted,
    });

    page.drawText(`${data.patientName} (${data.patientCode})`, {
      x: 45,
      y: currentY - 26,
      size: 11,
      font: fontBold,
      color: textDark,
    });

    page.drawText(`Phone: ${data.patientPhone}`, {
      x: 45,
      y: currentY - 40,
      size: 9,
      font: fontRegular,
      color: textMuted,
    });

    // Payment Status Badge Box
    const statusText = data.status.replace('_', ' ');
    const statusColor = data.status === 'PAID' ? successGreen : data.status === 'PARTIALLY_PAID' ? accentGold : primaryPurple;

    page.drawRectangle({
      x: width - 165,
      y: currentY - 40,
      width: 120,
      height: 30,
      color: statusColor,
    });

    page.drawText(statusText, {
      x: width - 155,
      y: currentY - 28,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    currentY -= 80;

    // 3. TABLE HEADER
    const colX = { desc: 45, type: 260, qty: 340, rate: 390, disc: 450, total: 510 };

    page.drawRectangle({
      x: 35,
      y: currentY - 22,
      width: width - 70,
      height: 24,
      color: primaryPurple,
    });

    page.drawText('ITEM DESCRIPTION', { x: colX.desc, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('TYPE', { x: colX.type, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('QTY', { x: colX.qty, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('RATE (Rs)', { x: colX.rate, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('DISC (Rs)', { x: colX.disc, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('TOTAL (Rs)', { x: colX.total, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    currentY -= 25;

    // 4. LINE ITEMS
    data.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      page.drawRectangle({
        x: 35,
        y: currentY - 20,
        width: width - 70,
        height: 22,
        color: isEven ? surfaceGray : rgb(1, 1, 1),
      });

      page.drawText(item.description.length > 35 ? item.description.substring(0, 32) + '...' : item.description, {
        x: colX.desc,
        y: currentY - 14,
        size: 9,
        font: fontRegular,
        color: textDark,
      });

      page.drawText(item.itemType, { x: colX.type, y: currentY - 14, size: 8, font: fontRegular, color: textMuted });
      page.drawText(String(item.quantity), { x: colX.qty, y: currentY - 14, size: 9, font: fontRegular, color: textDark });
      page.drawText(item.unitPrice.toFixed(2), { x: colX.rate, y: currentY - 14, size: 9, font: fontRegular, color: textDark });
      page.drawText(item.discount.toFixed(2), { x: colX.disc, y: currentY - 14, size: 9, font: fontRegular, color: textDark });
      page.drawText(item.totalPrice.toFixed(2), { x: colX.total, y: currentY - 14, size: 9, font: fontBold, color: textDark });

      currentY -= 22;
    });

    currentY -= 15;

    // 5. SUMMARY BOX (Right Aligned)
    const summaryWidth = 220;
    const summaryX = width - 35 - summaryWidth;

    page.drawRectangle({
      x: summaryX,
      y: currentY - 110,
      width: summaryWidth,
      height: 110,
      color: surfaceGray,
      borderColor: borderGray,
      borderWidth: 1,
    });

    let sY = currentY - 18;
    const drawSummaryRow = (label: string, value: string, isBold = false, color = textDark) => {
      page.drawText(label, { x: summaryX + 15, y: sY, size: 9, font: isBold ? fontBold : fontRegular, color: textMuted });
      page.drawText(value, { x: summaryX + summaryWidth - 75, y: sY, size: 9, font: isBold ? fontBold : fontRegular, color });
      sY -= 18;
    };

    drawSummaryRow('Subtotal:', `Rs.${data.subTotal.toFixed(2)}`);
    if (data.discountAmount > 0) {
      drawSummaryRow('Discount:', `- Rs.${data.discountAmount.toFixed(2)}`);
    }
    drawSummaryRow(`Tax (${data.taxRate}%):`, `Rs.${data.taxAmount.toFixed(2)}`);
    drawSummaryRow('Total Amount:', `Rs.${data.totalAmount.toFixed(2)}`, true, primaryPurple);
    drawSummaryRow('Amount Paid:', `Rs.${data.paidAmount.toFixed(2)}`, true, successGreen);
    drawSummaryRow('Balance Due:', `Rs.${data.dueAmount.toFixed(2)}`, true, data.dueAmount > 0 ? rgb(220 / 255, 38 / 255, 38 / 255) : textMuted);

    // 6. FOOTER / TERMS
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 40,
      color: surfaceGray,
    });

    page.drawText('Thank you for choosing Ewa Derma Clinic! For billing queries, contact 0120-5244840.', {
      x: 35,
      y: 15,
      size: 8,
      font: fontItalic,
      color: textMuted,
    });

    return pdfDoc.save();
  }
}
