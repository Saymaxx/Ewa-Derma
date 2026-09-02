import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
        buffer: Buffer.from('\uFEFF' + csvContent, 'utf-8'), // Add UTF-8 BOM for Excel
        mimeType,
        fileName: `ewa-derma-appointments-report-${timestamp}.${extension}`,
      };
    }

    // PDF Export
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

    // PDF Export
    const pdfBuffer = await this.generatePatientsPdf(reportData);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      fileName: `ewa-derma-patients-report-${timestamp}.pdf`,
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

    let y = 800;

    // Header Title
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

    // Summary Box
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

    // Table Header
    page.drawText('APPOINTMENT DETAILS', { x: 40, y, size: 11, font: fontBold, color: primaryColor });
    y -= 18;

    // Table Column Headers
    page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 20, color: primaryColor });
    page.drawText('Code', { x: 45, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Date', { x: 95, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Patient', { x: 160, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Doctor', { x: 290, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Type', { x: 420, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Status', { x: 480, y: y - 12, size: 8, font: fontBold, color: rgb(1, 1, 1) });

    y -= 24;

    // Table Data Rows
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

    let y = 800;

    // Header Title
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

    // Summary Box
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

    // New Patients Section
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
}
