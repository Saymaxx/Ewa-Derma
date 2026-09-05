import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getClinicLogoBuffer } from '../common/utils/logo.util';

@Injectable()
export class ReportExporterService {
  // -------------------------------------------------------------------
  // 1. EXPORT APPOINTMENTS REPORT (PDF / CSV / EXCEL)
  // -------------------------------------------------------------------
  async exportAppointmentReport(
    reportData: any,
    format: 'pdf' | 'csv' | 'excel',
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'excel') {
      const csvContent = this.buildAppointmentsCsv(reportData);
      const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
      const extension = format === 'csv' ? 'csv' : 'xls';
      return {
        buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'),
        mimeType,
        fileName: `ewa-derma-appointments-report-${timestamp}.${extension}`,
      };
    }

    const pdfBuffer = await this.generateAppointmentsPdf(reportData);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: `ewa-derma-appointments-report-${timestamp}.pdf`,
    };
  }

  // -------------------------------------------------------------------
  // 2. EXPORT PATIENTS REPORT (PDF / CSV / EXCEL)
  // -------------------------------------------------------------------
  async exportPatientReport(
    reportData: any,
    format: 'pdf' | 'csv' | 'excel',
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'excel') {
      const csvContent = this.buildPatientsCsv(reportData);
      const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
      const extension = format === 'csv' ? 'csv' : 'xls';
      return {
        buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'),
        mimeType,
        fileName: `ewa-derma-patients-report-${timestamp}.${extension}`,
      };
    }

    const pdfBuffer = await this.generatePatientsPdf(reportData);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: `ewa-derma-patients-report-${timestamp}.pdf`,
    };
  }

  // -------------------------------------------------------------------
  // 3. EXPORT REVENUE REPORT (PDF / CSV / EXCEL) — PHASE 7B
  // -------------------------------------------------------------------
  async exportRevenueReport(
    reportData: any,
    format: 'pdf' | 'csv' | 'excel',
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'excel') {
      const csvContent = this.buildRevenueCsv(reportData);
      const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
      const extension = format === 'csv' ? 'csv' : 'xls';
      return {
        buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'),
        mimeType,
        fileName: `ewa-derma-revenue-report-${timestamp}.${extension}`,
      };
    }

    const pdfBuffer = await this.generateRevenuePdf(reportData);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: `ewa-derma-revenue-report-${timestamp}.pdf`,
    };
  }

  // -------------------------------------------------------------------
  // 4. EXPORT INVENTORY REPORT (PDF / CSV / EXCEL) — PHASE 7B
  // -------------------------------------------------------------------
  async exportInventoryReport(
    reportData: any,
    format: 'pdf' | 'csv' | 'excel',
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv' || format === 'excel') {
      const csvContent = this.buildInventoryCsv(reportData);
      const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
      const extension = format === 'csv' ? 'csv' : 'xls';
      return {
        buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'),
        mimeType,
        fileName: `ewa-derma-inventory-report-${timestamp}.${extension}`,
      };
    }

    const pdfBuffer = await this.generateInventoryPdf(reportData);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: `ewa-derma-inventory-report-${timestamp}.pdf`,
    };
  }

  // -------------------------------------------------------------------
  // CSV HELPERS
  // -------------------------------------------------------------------
  private buildAppointmentsCsv(data: any): string {
    const lines: string[] = [];
    lines.push('EWA DERMA CLINIC - APPOINTMENTS REPORT');
    lines.push(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Total Booked,${data.summary.total}`);
    lines.push(`Completed,${data.summary.completed}`);
    lines.push(`Completion Rate,${data.summary.completionRate}%`);
    lines.push(`Cancelled,${data.summary.cancelled}`);
    lines.push(`No Show,${data.summary.noShow}`);
    lines.push('');
    lines.push('APPOINTMENT DETAILS');
    lines.push('Appointment Code,Date,Time,Patient Code,Patient Name,Phone,Doctor,Type,Status');

    for (const item of data.items) {
      lines.push(
        `"${item.appointmentCode}","${item.appointmentDate}","${item.startTime} - ${item.endTime}","${item.patientCode}","${item.patientName}","${item.patientPhone}","${item.doctorName}","${item.type}","${item.status}"`,
      );
    }
    return lines.join('\n');
  }

  private buildPatientsCsv(data: any): string {
    const lines: string[] = [];
    lines.push('EWA DERMA CLINIC - PATIENTS REPORT');
    lines.push(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`New Patients,${data.summary.totalNewPatients}`);
    lines.push(`Returning Patients,${data.summary.totalReturningPatients}`);
    lines.push(`Pending Follow-Ups,${data.summary.pendingFollowUps}`);
    lines.push(`Overdue Follow-Ups,${data.summary.overdueFollowUps}`);
    lines.push('');
    lines.push('NEW PATIENTS REGISTERED');
    lines.push('Patient Code,Name,Phone,Gender,Age,Registered Date');
    for (const p of data.newPatients) {
      lines.push(
        `"${p.patientCode}","${p.name}","${p.phone}","${p.gender || ''}","${p.age || ''}","${p.registeredOn}"`,
      );
    }
    lines.push('');
    lines.push('FOLLOW-UP TRACKING LIST');
    lines.push('Patient Code,Patient Name,Phone,Doctor,Diagnosis,Follow-Up Date,Overdue');
    for (const f of data.followUps) {
      lines.push(
        `"${f.patientCode}","${f.patientName}","${f.patientPhone}","${f.doctorName}","${f.diagnosis || ''}","${f.followUpDate || ''}","${f.isOverdue ? 'YES' : 'NO'}"`,
      );
    }
    return lines.join('\n');
  }

  private buildRevenueCsv(data: any): string {
    const lines: string[] = [];
    lines.push('EWA DERMA CLINIC - REVENUE & PAYMENTS REPORT');
    lines.push(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Collected Revenue (Actual Net Received),Rs. ${data.summary.collectedRevenue}`);
    lines.push(`Billed Revenue (Total Invoiced),Rs. ${data.summary.billedRevenue}`);
    lines.push(`Outstanding Balance Due,Rs. ${data.summary.totalOutstandingDue}`);
    lines.push(`Total Refunds Issued,Rs. ${data.summary.totalRefundsIssued}`);
    lines.push(`Total Invoices,${data.summary.invoiceCount}`);
    lines.push(`Total Payments,${data.summary.paymentCount}`);
    lines.push('');
    lines.push('PAYMENT METHOD BREAKDOWN');
    lines.push('Method,Txn Count,Amount (Rs),Percentage');
    for (const pm of data.paymentMethodBreakdown) {
      lines.push(`"${pm.method}",${pm.count},${pm.amount},${pm.percentage}%`);
    }
    lines.push('');
    lines.push('DOCTOR REVENUE ATTRIBUTION');
    lines.push('Doctor Name,Billed (Rs),Collected (Rs),Invoices');
    for (const d of data.doctorBreakdown) {
      lines.push(`"${d.doctorName}",${d.billed},${d.collected},${d.invoiceCount}`);
    }
    lines.push('');
    lines.push('INVOICE RECORDS');
    lines.push('Invoice Code,Date,Patient Code,Patient Name,Phone,Doctor,Status,Total Amount (Rs),Paid (Rs),Due (Rs)');
    for (const inv of data.items) {
      lines.push(
        `"${inv.invoiceCode}","${inv.createdAt}","${inv.patientCode}","${inv.patientName}","${inv.patientPhone}","${inv.doctorName}","${inv.status}",${inv.totalAmount},${inv.paidAmount},${inv.dueAmount}`,
      );
    }
    return lines.join('\n');
  }

  private buildInventoryCsv(data: any): string {
    const lines: string[] = [];
    lines.push('EWA DERMA CLINIC - INVENTORY & STOCK MOVEMENT REPORT');
    lines.push(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Total Inventory Valuation,Rs. ${data.summary.totalInventoryValue}`);
    lines.push(`Medicines Count,${data.summary.totalMedicinesCount}`);
    lines.push(`Low Stock Items,${data.summary.lowStockCount}`);
    lines.push(`Expiring Batches,${data.summary.expiringBatchesCount}`);
    lines.push(`Items Dispensed,${data.summary.totalItemsDispensed}`);
    lines.push('');
    lines.push('CURRENT STOCK FORMULARY');
    lines.push('Name,Brand,Category,SKU,Computed Stock,Min Stock,Purchase Price,Valuation (Rs),Low Stock');
    for (const m of data.currentStockItems) {
      lines.push(
        `"${m.name}","${m.brandName || ''}","${m.category}","${m.sku}",${m.computedStock},${m.minimumStock},${m.purchasePrice},${m.stockValuation},"${m.isLowStock ? 'YES' : 'NO'}"`,
      );
    }
    lines.push('');
    lines.push('STOCK MOVEMENTS LEDGER');
    lines.push('Date,Timestamp,Medicine,SKU,Batch,Type,Qty,Performed By,Reason');
    for (const mov of data.movements) {
      lines.push(
        `"${mov.date}","${mov.timestamp}","${mov.medicineName}","${mov.sku}","${mov.batchNumber}","${mov.type}",${mov.quantity},"${mov.performedBy}","${mov.reason}"`,
      );
    }
    return lines.join('\n');
  }

  private async drawHeaderLogo(pdfDoc: PDFDocument, page: any) {
    const logoBuffer = getClinicLogoBuffer();
    if (logoBuffer) {
      try {
        const logoImg = await pdfDoc.embedJpg(logoBuffer);
        const logoSize = 44;
        page.drawRectangle({
          x: 510 - 2,
          y: 765 - 2,
          width: logoSize + 4,
          height: logoSize + 4,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.788, 0.635, 0.294),
          borderWidth: 1,
        });
        page.drawImage(logoImg, {
          x: 510,
          y: 765,
          width: logoSize,
          height: logoSize,
        });
      } catch {
        // Fallback silently if logo buffer cannot be read
      }
    }
  }

  // -------------------------------------------------------------------
  // PDF GENERATION VIA PDF-LIB
  // -------------------------------------------------------------------
  private async generateAppointmentsPdf(data: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.117, 0.305, 0.549); // #1E4E8C
    const goldColor = rgb(0.788, 0.635, 0.294); // #C9A24B
    const darkTextColor = rgb(0.12, 0.16, 0.22);
    const mutedTextColor = rgb(0.45, 0.5, 0.58);

    await this.drawHeaderLogo(pdfDoc, page);

    let y = 800;

    page.drawText('EWA DERMA CLINIC', { x: 40, y, size: 20, font: fontBold, color: primaryColor });
    y -= 18;
    page.drawText('CLINICAL APPOINTMENTS & ACTIVITY REPORT', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: goldColor,
    });
    y -= 14;
    page.drawText(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 380,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });

    y -= 25;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: primaryColor });
    y -= 25;

    page.drawRectangle({
      x: 40,
      y: y - 50,
      width: 515,
      height: 55,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
    });

    page.drawText('SUMMARY METRICS', { x: 55, y: y - 15, size: 10, font: fontBold, color: primaryColor });
    const summaryText = `Total Booked: ${data.summary.total}  |  Completed: ${data.summary.completed}  |  Completion Rate: ${data.summary.completionRate}%  |  Cancelled: ${data.summary.cancelled}`;
    page.drawText(summaryText, { x: 55, y: y - 35, size: 9, font, color: darkTextColor });

    y -= 75;

    page.drawText('APPOINTMENT DETAILS', { x: 40, y, size: 11, font: fontBold, color: primaryColor });
    y -= 18;

    page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 20, color: primaryColor });
    page.drawText('Code', { x: 45, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Date', { x: 95, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Patient', { x: 160, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Doctor', { x: 290, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Type', { x: 420, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Status', { x: 480, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 24;

    for (const item of data.items) {
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }

      page.drawText(item.appointmentCode, { x: 45, y, size: 8, font, color: darkTextColor });
      page.drawText(item.appointmentDate, { x: 95, y, size: 8, font, color: darkTextColor });
      page.drawText(item.patientName.substring(0, 20), { x: 160, y, size: 8, font, color: darkTextColor });
      page.drawText(item.doctorName.substring(0, 20), { x: 290, y, size: 8, font, color: darkTextColor });
      page.drawText(item.type, { x: 420, y, size: 8, font, color: darkTextColor });
      page.drawText(item.status, { x: 480, y, size: 8, font: fontBold, color: primaryColor });

      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async generatePatientsPdf(data: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryColor = rgb(0.117, 0.305, 0.549);
    const goldColor = rgb(0.788, 0.635, 0.294);
    const darkTextColor = rgb(0.12, 0.16, 0.22);
    const mutedTextColor = rgb(0.45, 0.5, 0.58);

    await this.drawHeaderLogo(pdfDoc, page);

    let y = 800;

    page.drawText('EWA DERMA CLINIC', { x: 40, y, size: 20, font: fontBold, color: primaryColor });
    y -= 18;
    page.drawText('PATIENT REGISTRATION & FOLLOW-UP REPORT', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: goldColor,
    });
    y -= 14;
    page.drawText(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 380,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });

    y -= 25;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: primaryColor });
    y -= 25;

    page.drawRectangle({
      x: 40,
      y: y - 50,
      width: 515,
      height: 55,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
    });

    page.drawText('PATIENT SUMMARY METRICS', { x: 55, y: y - 15, size: 10, font: fontBold, color: primaryColor });
    const summaryText = `New Patients: ${data.summary.totalNewPatients}  |  Returning Patients: ${data.summary.totalReturningPatients}  |  Pending Follow-ups: ${data.summary.pendingFollowUps}  |  Overdue: ${data.summary.overdueFollowUps}`;
    page.drawText(summaryText, { x: 55, y: y - 35, size: 9, font, color: darkTextColor });

    y -= 75;

    page.drawText('NEW PATIENTS REGISTERED', { x: 40, y, size: 11, font: fontBold, color: primaryColor });
    y -= 18;

    page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 20, color: primaryColor });
    page.drawText('Code', { x: 45, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Name', { x: 110, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Phone', { x: 260, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Gender', { x: 370, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Registered Date', { x: 450, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 24;

    for (const p of data.newPatients) {
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(p.patientCode, { x: 45, y, size: 8, font, color: darkTextColor });
      page.drawText(p.name.substring(0, 22), { x: 110, y, size: 8, font, color: darkTextColor });
      page.drawText(p.phone, { x: 260, y, size: 8, font, color: darkTextColor });
      page.drawText(p.gender || 'N/A', { x: 370, y, size: 8, font, color: darkTextColor });
      page.drawText(p.registeredOn, { x: 450, y, size: 8, font, color: darkTextColor });
      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async generateRevenuePdf(data: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryPurple = rgb(91 / 255, 33 / 255, 182 / 255);
    const accentGold = rgb(201 / 255, 162 / 255, 75 / 255);
    const darkTextColor = rgb(0.12, 0.16, 0.22);
    const mutedTextColor = rgb(0.45, 0.5, 0.58);

    await this.drawHeaderLogo(pdfDoc, page);

    let y = 800;

    page.drawText('EWA DERMA CLINIC', { x: 40, y, size: 20, font: fontBold, color: primaryPurple });
    y -= 18;
    page.drawText('FINANCIAL REVENUE & PAYMENTS AUDIT REPORT', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: accentGold,
    });
    y -= 14;
    page.drawText(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 380,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });

    y -= 25;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: primaryPurple });
    y -= 25;

    // Summary Box
    page.drawRectangle({
      x: 40,
      y: y - 60,
      width: 515,
      height: 65,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
    });

    page.drawText('FINANCIAL SUMMARY METRICS', { x: 55, y: y - 15, size: 10, font: fontBold, color: primaryPurple });
    page.drawText(
      `Collected Revenue (Net): Rs. ${data.summary.collectedRevenue.toLocaleString()}  |  Billed Revenue: Rs. ${data.summary.billedRevenue.toLocaleString()}`,
      { x: 55, y: y - 32, size: 9, font: fontBold, color: darkTextColor },
    );
    page.drawText(
      `Balance Due: Rs. ${data.summary.totalOutstandingDue.toLocaleString()}  |  Refunds Issued: Rs. ${data.summary.totalRefundsIssued.toLocaleString()}`,
      { x: 55, y: y - 48, size: 8.5, font, color: mutedTextColor },
    );

    y -= 85;

    // Invoices Table
    page.drawText('INVOICE DISPATCH & PAYMENT RECORDS', { x: 40, y, size: 11, font: fontBold, color: primaryPurple });
    y -= 18;

    page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 20, color: primaryPurple });
    page.drawText('Code', { x: 45, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Date', { x: 100, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Patient Name', { x: 160, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Total (Rs)', { x: 310, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Paid (Rs)', { x: 390, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Status', { x: 470, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 24;

    for (const inv of data.items) {
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(inv.invoiceCode, { x: 45, y, size: 8, font, color: darkTextColor });
      page.drawText(inv.createdAt, { x: 100, y, size: 8, font, color: darkTextColor });
      page.drawText(inv.patientName.substring(0, 22), { x: 160, y, size: 8, font, color: darkTextColor });
      page.drawText(inv.totalAmount.toFixed(2), { x: 310, y, size: 8, font, color: darkTextColor });
      page.drawText(inv.paidAmount.toFixed(2), { x: 390, y, size: 8, font: fontBold, color: rgb(16 / 255, 185 / 255, 129 / 255) });
      page.drawText(inv.status, { x: 470, y, size: 8, font: fontBold, color: primaryPurple });
      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async generateInventoryPdf(data: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const primaryBlue = rgb(30 / 255, 78 / 255, 140 / 255);
    const accentGold = rgb(201 / 255, 162 / 255, 75 / 255);
    const darkTextColor = rgb(0.12, 0.16, 0.22);
    const mutedTextColor = rgb(0.45, 0.5, 0.58);

    await this.drawHeaderLogo(pdfDoc, page);

    let y = 800;

    page.drawText('EWA DERMA CLINIC', { x: 40, y, size: 20, font: fontBold, color: primaryBlue });
    y -= 18;
    page.drawText('PHARMACY INVENTORY & STOCK MOVEMENT AUDIT', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: accentGold,
    });
    y -= 14;
    page.drawText(`Date Range: ${data.dateRange.startDate} to ${data.dateRange.endDate}`, {
      x: 40,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 380,
      y,
      size: 9,
      font,
      color: mutedTextColor,
    });

    y -= 25;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: primaryBlue });
    y -= 25;

    page.drawRectangle({
      x: 40,
      y: y - 50,
      width: 515,
      height: 55,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
    });

    page.drawText('INVENTORY SUMMARY METRICS', { x: 55, y: y - 15, size: 10, font: fontBold, color: primaryBlue });
    const summaryText = `Total Valuation: Rs. ${data.summary.totalInventoryValue.toLocaleString()}  |  Medicines: ${data.summary.totalMedicinesCount}  |  Low Stock: ${data.summary.lowStockCount}  |  Dispensed: ${data.summary.totalItemsDispensed}`;
    page.drawText(summaryText, { x: 55, y: y - 35, size: 8.5, font, color: darkTextColor });

    y -= 75;

    page.drawText('CURRENT STOCK FORMULARY', { x: 40, y, size: 11, font: fontBold, color: primaryBlue });
    y -= 18;

    page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 20, color: primaryBlue });
    page.drawText('Name', { x: 45, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('SKU', { x: 180, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Category', { x: 260, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Stock', { x: 350, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Valuation (Rs)', { x: 430, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 24;

    for (const m of data.currentStockItems) {
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(m.name.substring(0, 22), { x: 45, y, size: 8, font, color: darkTextColor });
      page.drawText(m.sku, { x: 180, y, size: 8, font, color: darkTextColor });
      page.drawText(m.category, { x: 260, y, size: 8, font, color: darkTextColor });
      page.drawText(`${m.computedStock} (min ${m.minimumStock})`, { x: 350, y, size: 8, font: fontBold, color: m.isLowStock ? rgb(220 / 255, 38 / 255, 38 / 255) : darkTextColor });
      page.drawText(m.stockValuation.toFixed(2), { x: 430, y, size: 8, font, color: darkTextColor });
      y -= 16;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
