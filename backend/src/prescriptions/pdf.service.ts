import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { getClinicLogoBuffer } from '../common/utils/logo.util';

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

  /**
   * Helper to wrap long text within a maximum pixel width
   */
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    if (!text || text.trim().length === 0) return [];
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  async generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 Size
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Color Palette Tokens
    const primaryBlue = rgb(30 / 255, 78 / 255, 140 / 255);    // #1E4E8C Royal Navy
    const primaryDark = rgb(19 / 255, 52 / 255, 96 / 255);     // #133460
    const accentGold = rgb(201 / 255, 162 / 255, 75 / 255);    // #C9A24B Warm Gold
    const textDark = rgb(27 / 255, 38 / 255, 59 / 255);        // #1B263B Slate Dark
    const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);   // #64748B Slate Muted
    const surfaceGray = rgb(248 / 255, 250 / 255, 252 / 255);  // #F8FAFC Subtle Gray
    const surfaceAlt = rgb(241 / 255, 245 / 255, 249 / 255);   // #F1F5F9 Row Alternate
    const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);   // #E2E8F0 Clean Border

    // Normalize Doctor Name (prevent "Dr. Dr. Name")
    const cleanDocName = data.doctorName.trim().startsWith('Dr.')
      ? data.doctorName.trim()
      : `Dr. ${data.doctorName.trim()}`;

    // =========================================================================
    // 1. TOP CLINIC BRANDING HEADER BANNER
    // =========================================================================
    const headerHeight = 88;
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width,
      height: headerHeight,
      color: primaryBlue,
    });

    // Gold Accent Ribbon
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
      y: height - 38,
      size: 19,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Subtitle
    page.drawText('DERMATOLOGY, AESTHETICS & ADVANCED HAIR CARE CLINIC', {
      x: 35,
      y: height - 54,
      size: 8,
      font: fontBold,
      color: accentGold,
    });

    // Address & Phone
    page.drawText(`${data.clinicAddress} | Phone: ${data.clinicPhone}`, {
      x: 35,
      y: height - 72,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.92, 0.95, 0.99),
    });

    // Embed Clinic Logo Image (Top-Right)
    const logoBuffer = getClinicLogoBuffer();
    if (logoBuffer) {
      try {
        const logoImg = await pdfDoc.embedJpg(logoBuffer);
        const logoSize = 62;
        const logoX = width - 35 - logoSize;
        const logoY = height - headerHeight + (headerHeight - logoSize) / 2;

        page.drawRectangle({
          x: logoX - 2,
          y: logoY - 2,
          width: logoSize + 4,
          height: logoSize + 4,
          color: rgb(1, 1, 1),
          borderColor: accentGold,
          borderWidth: 1.5,
        });

        page.drawImage(logoImg, {
          x: logoX,
          y: logoY,
          width: logoSize,
          height: logoSize,
        });
      } catch (err: any) {
        this.logger.warn(`Could not embed logo image in prescription: ${err.message}`);
      }
    }

    // =========================================================================
    // 2. DOCTOR & PRESCRIPTION METADATA BAR
    // =========================================================================
    let currentY = height - headerHeight - 26;

    // Doctor Details (Left)
    page.drawText(cleanDocName, {
      x: 35,
      y: currentY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });

    const docSub = `${data.doctorSpecialization}${data.doctorRegNumber ? ` | Reg. No: ${data.doctorRegNumber}` : ''}`;
    page.drawText(docSub, {
      x: 35,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: textMuted,
    });

    // Prescription ID & Version (Right)
    const rxCodeText = `Rx: ${data.prescriptionCode} (v${data.version})`;
    const rxCodeWidth = fontBold.widthOfTextAtSize(rxCodeText, 11);
    page.drawText(rxCodeText, {
      x: width - 35 - rxCodeWidth,
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

    // Hairline Separator
    currentY -= 24;
    page.drawLine({
      start: { x: 35, y: currentY },
      end: { x: width - 35, y: currentY },
      thickness: 0.75,
      color: borderGray,
    });

    // =========================================================================
    // 3. PATIENT INFORMATION CARD (Balanced Grid)
    // =========================================================================
    currentY -= 12;
    const patientCardHeight = 46;
    page.drawRectangle({
      x: 35,
      y: currentY - patientCardHeight,
      width: width - 70,
      height: patientCardHeight,
      color: surfaceGray,
      borderColor: borderGray,
      borderWidth: 1,
    });

    // Patient Details Header Tag
    page.drawText('PATIENT INFORMATION', {
      x: 48,
      y: currentY - 14,
      size: 7,
      font: fontBold,
      color: accentGold,
    });

    // Col 1: Name
    page.drawText('Name:', { x: 48, y: currentY - 28, size: 8, font: fontRegular, color: textMuted });
    page.drawText(data.patientName, { x: 78, y: currentY - 28, size: 9, font: fontBold, color: textDark });

    // Col 2: Patient ID
    page.drawText('Patient ID:', { x: 200, y: currentY - 28, size: 8, font: fontRegular, color: textMuted });
    page.drawText(data.patientCode, { x: 245, y: currentY - 28, size: 8.5, font: fontBold, color: primaryBlue });

    // Col 3: Gender / Age
    page.drawText('Gender/Age:', { x: 320, y: currentY - 28, size: 8, font: fontRegular, color: textMuted });
    page.drawText(data.patientAgeGender || 'Not Specified', { x: 375, y: currentY - 28, size: 8.5, font: fontRegular, color: textDark });

    // Col 4: Phone
    page.drawText('Contact:', { x: 445, y: currentY - 28, size: 8, font: fontRegular, color: textMuted });
    page.drawText(data.patientPhone || 'N/A', { x: 482, y: currentY - 28, size: 8.5, font: fontRegular, color: textDark });

    currentY -= patientCardHeight + 16;

    // =========================================================================
    // 4. CLINICAL DIAGNOSIS (If Available)
    // =========================================================================
    if (data.diagnoses && data.diagnoses.length > 0) {
      page.drawText('DIAGNOSIS / FINDINGS:', {
        x: 35,
        y: currentY,
        size: 8.5,
        font: fontBold,
        color: primaryBlue,
      });

      page.drawText(data.diagnoses.join(', '), {
        x: 165,
        y: currentY,
        size: 8.5,
        font: fontBold,
        color: textDark,
      });

      currentY -= 18;
    }

    // =========================================================================
    // 5. RX MEDICATIONS & DOSAGE TABLE (Impeccably Structured & Aligned)
    // =========================================================================
    // Section Title
    page.drawText('Rx (Medications & Dosage Schedule)', {
      x: 35,
      y: currentY,
      size: 10.5,
      font: fontBold,
      color: primaryBlue,
    });

    currentY -= 14;

    // Column Definitions:
    // Available Total Table Width = 595.28 - 70 = 525.28
    const colPos = {
      num: 43,      // # (Width: 22)
      name: 68,     // Medicine Name & Strength (Width: 192)
      freq: 265,    // Frequency / Timing (Width: 105)
      dur: 375,     // Duration (Width: 65)
      route: 445,   // Route & Instructions (Width: 115)
    };

    // Table Header Bar (Height: 22, perfectly centered vertically)
    const thHeight = 22;
    page.drawRectangle({
      x: 35,
      y: currentY - thHeight,
      width: width - 70,
      height: thHeight,
      color: primaryBlue,
    });

    // Gold accent underline on table header
    page.drawRectangle({
      x: 35,
      y: currentY - thHeight - 1.5,
      width: width - 70,
      height: 1.5,
      color: accentGold,
    });

    const thTextY = currentY - 14.5;
    page.drawText('#', { x: colPos.num, y: thTextY, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('MEDICINE NAME & STRENGTH', { x: colPos.name, y: thTextY, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('FREQUENCY / TIMING', { x: colPos.freq, y: thTextY, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('DURATION', { x: colPos.dur, y: thTextY, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('ROUTE / INSTRUCTIONS', { x: colPos.route, y: thTextY, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

    currentY -= thHeight + 4;

    // Table Rows
    if (!data.items || data.items.length === 0) {
      const emptyRowHeight = 36;
      page.drawRectangle({
        x: 35,
        y: currentY - emptyRowHeight,
        width: width - 70,
        height: emptyRowHeight,
        color: surfaceGray,
      });
      page.drawLine({
        start: { x: 35, y: currentY - emptyRowHeight },
        end: { x: width - 35, y: currentY - emptyRowHeight },
        thickness: 0.5,
        color: borderGray,
      });
      page.drawText('Handwritten prescription / doctor slip attached. Refer to physical slip scan in patient profile.', {
        x: colPos.name,
        y: currentY - 22,
        size: 8,
        font: fontItalic,
        color: textMuted,
      });
      currentY -= emptyRowHeight;
    } else {
      data.items.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        const rowHeight = 32;

        // Row background
        page.drawRectangle({
          x: 35,
          y: currentY - rowHeight,
          width: width - 70,
          height: rowHeight,
          color: isEven ? surfaceGray : rgb(1, 1, 1),
        });

        // Bottom Row Divider
        page.drawLine({
          start: { x: 35, y: currentY - rowHeight },
          end: { x: width - 35, y: currentY - rowHeight },
          thickness: 0.5,
          color: borderGray,
        });

        // Col 1: Number (#)
        page.drawText(`${idx + 1}`, {
          x: colPos.num + 2,
          y: currentY - 15,
          size: 8.5,
          font: fontBold,
          color: primaryBlue,
        });

        // Col 2: Medicine Name (Line 1: Name, Line 2: Dosage/Strength if present)
        const medName = item.medicineName.length > 30 ? `${item.medicineName.substring(0, 28)}...` : item.medicineName;
        page.drawText(medName, {
          x: colPos.name,
          y: currentY - 13,
          size: 8.5,
          font: fontBold,
          color: textDark,
        });

        if (item.dosage) {
          page.drawText(item.dosage, {
            x: colPos.name,
            y: currentY - 24,
            size: 7.5,
            font: fontRegular,
            color: textMuted,
          });
        }

        // Col 3: Frequency / Timing
        const freqText = item.frequency || '-';
        page.drawText(freqText.length > 20 ? `${freqText.substring(0, 18)}...` : freqText, {
          x: colPos.freq,
          y: currentY - 16,
          size: 8,
          font: fontBold,
          color: primaryBlue,
        });

        // Col 4: Duration
        const durText = item.duration || '-';
        page.drawText(durText, {
          x: colPos.dur,
          y: currentY - 16,
          size: 8,
          font: fontRegular,
          color: textDark,
        });

        // Col 5: Route & Instructions
        const routeText = item.route || 'Oral';
        page.drawText(routeText, {
          x: colPos.route,
          y: currentY - 13,
          size: 8,
          font: fontBold,
          color: textDark,
        });

        if (item.instructions) {
          const cleanInstr = item.instructions.length > 24
            ? `${item.instructions.substring(0, 22)}...`
            : item.instructions;
          page.drawText(cleanInstr, {
            x: colPos.route,
            y: currentY - 24,
            size: 7.5,
            font: fontItalic,
            color: textMuted,
          });
        }

        currentY -= rowHeight;
      });
    }

    // =========================================================================
    // 6. GENERAL ADVICE & LIFESTYLE INSTRUCTIONS
    // =========================================================================
    currentY -= 16;
    if (data.generalAdvice && data.generalAdvice.trim()) {
      page.drawText('GENERAL ADVICE / PRECAUTIONS:', {
        x: 35,
        y: currentY,
        size: 8.5,
        font: fontBold,
        color: primaryBlue,
      });

      currentY -= 10;

      const adviceLines = this.wrapText(data.generalAdvice, fontRegular, 8, width - 96);
      const adviceBoxHeight = Math.max(32, adviceLines.length * 13 + 14);

      // Advice Container with Gold Left Accent Border
      page.drawRectangle({
        x: 35,
        y: currentY - adviceBoxHeight,
        width: width - 70,
        height: adviceBoxHeight,
        color: surfaceGray,
        borderColor: borderGray,
        borderWidth: 1,
      });

      page.drawRectangle({
        x: 35,
        y: currentY - adviceBoxHeight,
        width: 3.5,
        height: adviceBoxHeight,
        color: accentGold,
      });

      let lineY = currentY - 14;
      for (const line of adviceLines.slice(0, 4)) {
        page.drawText(line, {
          x: 48,
          y: lineY,
          size: 8,
          font: fontRegular,
          color: textDark,
        });
        lineY -= 12;
      }

      currentY -= adviceBoxHeight + 14;
    }

    // =========================================================================
    // 7. NEXT FOLLOW-UP REVIEW
    // =========================================================================
    if (data.followUpDate) {
      page.drawRectangle({
        x: 35,
        y: currentY - 22,
        width: 250,
        height: 22,
        color: surfaceAlt,
        borderColor: accentGold,
        borderWidth: 1,
      });

      page.drawText(`Next Follow-up Review: ${data.followUpDate}`, {
        x: 45,
        y: currentY - 15,
        size: 8,
        font: fontBold,
        color: primaryBlue,
      });

      currentY -= 30;
    }

    // =========================================================================
    // 8. DOCTOR SIGNATURE AREA & FOOTER
    // =========================================================================
    const footerY = 60;

    // Doctor Signature Block (Right Aligned)
    const sigLineX1 = width - 200;
    const sigLineX2 = width - 35;
    page.drawLine({
      start: { x: sigLineX1, y: footerY + 36 },
      end: { x: sigLineX2, y: footerY + 36 },
      thickness: 0.75,
      color: textMuted,
    });

    page.drawText(cleanDocName, {
      x: sigLineX1 + 10,
      y: footerY + 22,
      size: 9.5,
      font: fontBold,
      color: primaryBlue,
    });

    page.drawText(data.doctorSpecialization || 'Authorized Dermatologist', {
      x: sigLineX1 + 10,
      y: footerY + 10,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });

    // Bottom Legal Disclaimer Banner
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 24,
      color: primaryBlue,
    });

    page.drawText(
      'This prescription is generated electronically by Ewa Derma Clinic Management System. Valid without physical signature.',
      {
        x: 60,
        y: 8,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.92, 0.95, 0.99),
      },
    );

    return pdfDoc.save();
  }
}
