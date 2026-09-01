import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PrescriptionPdfData {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  prescriptionCode: string;
  version: number;
  date: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorRegNumber?: string;
  patientName: string;
  patientCode: string;
  patientAgeGender: string;
  patientPhone: string;
  diagnoses: string[];
  items: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions?: string;
  }[];
  generalAdvice?: string;
  followUpDate?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Color Palette Tokens
    const primaryBlue = rgb(30 / 255, 78 / 255, 140 / 255); // #1E4E8C
    const accentGold = rgb(201 / 255, 162 / 255, 75 / 255);  // #C9A24B
    const textDark = rgb(27 / 255, 38 / 59 / 255, 59 / 255);    // #1B263B
    const textMuted = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B
    const surfaceGray = rgb(247 / 255, 248 / 255, 250 / 255);
    const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);

    // 1. TOP HEADER BANNER (Blue Background)
    const headerHeight = 90;
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width,
      height: headerHeight,
      color: primaryBlue,
    });

    // Gold Accent Line
    page.drawRectangle({
      x: 0,
      y: height - headerHeight - 4,
      width,
      height: 4,
      color: accentGold,
    });

    // Clinic Branding Header
    page.drawText(data.clinicName.toUpperCase(), {
      x: 35,
      y: height - 40,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('DERMATOLOGY, AESTHETICS & HAIR CARE CLINIC', {
      x: 35,
      y: height - 56,
      size: 8,
      font: fontBold,
      color: accentGold,
    });

    page.drawText(`${data.clinicAddress} | Phone: ${data.clinicPhone}`, {
      x: 35,
      y: height - 74,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.9, 0.93, 0.98),
    });

    // 2. DOCTOR & PRESCRIPTION METADATA BAR
    let currentY = height - headerHeight - 28;

    // Doctor info (Left)
    page.drawText(`Dr. ${data.doctorName}`, {
      x: 35,
      y: currentY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });
    page.drawText(`${data.doctorSpecialization}${data.doctorRegNumber ? ` | Reg. No: ${data.doctorRegNumber}` : ''}`, {
      x: 35,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: textMuted,
    });

    // Prescription ID & Version (Right)
    const rxText = `Rx: ${data.prescriptionCode} (v${data.version})`;
    const rxWidth = fontBold.widthOfTextAtSize(rxText, 11);
    page.drawText(rxText, {
      x: width - 35 - rxWidth,
      y: currentY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });

    const dateText = `Date: ${data.date}`;
    const dateWidth = fontRegular.widthOfTextAtSize(dateText, 8.5);
    page.drawText(dateText, {
      x: width - 35 - dateWidth,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: textMuted,
    });

    // Divider Line
    currentY -= 28;
    page.drawLine({
      start: { x: 35, y: currentY },
      end: { x: width - 35, y: currentY },
      thickness: 1,
      color: borderGray,
    });

    // 3. PATIENT INFORMATION CARD
    currentY -= 14;
    const cardHeight = 44;
    page.drawRectangle({
      x: 35,
      y: currentY - cardHeight,
      width: width - 70,
      height: cardHeight,
      color: surfaceGray,
      borderColor: borderGray,
      borderWidth: 1,
    });

    page.drawText('PATIENT DETAILS', {
      x: 48,
      y: currentY - 16,
      size: 7.5,
      font: fontBold,
      color: accentGold,
    });

    page.drawText(`Name: ${data.patientName}`, {
      x: 48,
      y: currentY - 32,
      size: 9.5,
      font: fontBold,
      color: textDark,
    });

    page.drawText(`Patient ID: ${data.patientCode}`, {
      x: 230,
      y: currentY - 32,
      size: 9,
      font: fontRegular,
      color: textDark,
    });

    page.drawText(`Age / Gender: ${data.patientAgeGender}`, {
      x: 350,
      y: currentY - 32,
      size: 9,
      font: fontRegular,
      color: textDark,
    });

    page.drawText(`Phone: ${data.patientPhone}`, {
      x: 480,
      y: currentY - 32,
      size: 9,
      font: fontRegular,
      color: textDark,
    });

    currentY -= cardHeight + 20;

    // 4. DIAGNOSIS SECTION
    if (data.diagnoses && data.diagnoses.length > 0) {
      page.drawText('PROVISIONAL / CLINICAL DIAGNOSIS:', {
        x: 35,
        y: currentY,
        size: 9,
        font: fontBold,
        color: primaryBlue,
      });

      page.drawText(data.diagnoses.join(', '), {
        x: 220,
        y: currentY,
        size: 9,
        font: fontBold,
        color: textDark,
      });

      currentY -= 18;
    }

    // 5. RX / MEDICINES TABLE HEADER
    page.drawText('Rx (Medications & Dosage)', {
      x: 35,
      y: currentY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });

    currentY -= 14;

    // Table Header Bar
    const tableHeaderY = currentY;
    page.drawRectangle({
      x: 35,
      y: tableHeaderY - 18,
      width: width - 70,
      height: 18,
      color: primaryBlue,
    });

    page.drawText('#', { x: 42, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('MEDICINE NAME & STRENGTH', { x: 65, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('FREQUENCY', { x: 250, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('DURATION', { x: 360, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('ROUTE / INSTRUCTIONS', { x: 435, y: tableHeaderY - 13, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

    currentY -= 20;

    // Table Item Rows
    data.items.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const rowHeight = 28;

      if (isEven) {
        page.drawRectangle({
          x: 35,
          y: currentY - rowHeight + 8,
          width: width - 70,
          height: rowHeight,
          color: surfaceGray,
        });
      }

      page.drawText(`${idx + 1}`, {
        x: 42,
        y: currentY - 6,
        size: 8.5,
        font: fontBold,
        color: textMuted,
      });

      page.drawText(`${item.medicineName} (${item.dosage})`, {
        x: 65,
        y: currentY - 6,
        size: 8.5,
        font: fontBold,
        color: textDark,
      });

      page.drawText(`${item.frequency}`, {
        x: 250,
        y: currentY - 6,
        size: 8,
        font: fontRegular,
        color: textDark,
      });

      page.drawText(`${item.duration}`, {
        x: 360,
        y: currentY - 6,
        size: 8,
        font: fontRegular,
        color: textDark,
      });

      const instrText = `${item.route}${item.instructions ? ` - ${item.instructions}` : ''}`;
      page.drawText(instrText.length > 25 ? instrText.substring(0, 24) + '...' : instrText, {
        x: 435,
        y: currentY - 6,
        size: 7.5,
        font: fontItalic,
        color: textMuted,
      });

      currentY -= rowHeight;
    });

    // 6. GENERAL ADVICE & LIFESTYLE INSTRUCTIONS
    currentY -= 15;
    if (data.generalAdvice) {
      page.drawText('GENERAL ADVICE / PRECAUTIONS:', {
        x: 35,
        y: currentY,
        size: 9,
        font: fontBold,
        color: primaryBlue,
      });
      currentY -= 14;

      page.drawRectangle({
        x: 35,
        y: currentY - 32,
        width: width - 70,
        height: 32,
        color: surfaceGray,
        borderColor: borderGray,
        borderWidth: 1,
      });

      page.drawText(data.generalAdvice, {
        x: 45,
        y: currentY - 18,
        size: 8,
        font: fontRegular,
        color: textDark,
      });

      currentY -= 45;
    }

    // 7. FOLLOW-UP APPOINTMENT
    if (data.followUpDate) {
      page.drawText(`Next Follow-up Review: ${data.followUpDate}`, {
        x: 35,
        y: currentY,
        size: 9,
        font: fontBold,
        color: accentGold,
      });
    }

    // 8. FOOTER WITH DOCTOR SIGNATURE LINE & CLINIC NOTICE
    const footerY = 65;

    // Doctor Signature Area (Right aligned)
    page.drawLine({
      start: { x: width - 180, y: footerY + 30 },
      end: { x: width - 35, y: footerY + 30 },
      thickness: 1,
      color: textMuted,
    });
    page.drawText(`Dr. ${data.doctorName}`, {
      x: width - 160,
      y: footerY + 16,
      size: 9,
      font: fontBold,
      color: primaryBlue,
    });
    page.drawText('Authorized Medical Practitioner', {
      x: width - 175,
      y: footerY + 4,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });

    // Bottom Notice
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 25,
      color: primaryBlue,
    });

    page.drawText(
      'This prescription is generated electronically by Ewa Derma Clinic Management System. Valid without physical stamp.',
      {
        x: 70,
        y: 8,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.9, 0.93, 0.98),
      },
    );

    return pdfDoc.save();
  }
}
