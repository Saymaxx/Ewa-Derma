export interface InvoiceTemplateData {
  patientName: string;
  invoiceCode: string;
  totalAmount: string | number;
  clinicName?: string;
  contactPhone?: string;
}

export interface PrescriptionTemplateData {
  patientName: string;
  doctorName: string;
  prescriptionCode: string;
  clinicName?: string;
  contactPhone?: string;
}

export interface AppointmentReminderTemplateData {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  clinicName?: string;
  clinicAddress?: string;
  contactPhone?: string;
}

export class NotificationTemplates {
  private static readonly CLINIC_NAME = 'Ewa Derma Clinic';
  private static readonly CLINIC_PHONE = '+91 98765 43210';
  private static readonly CLINIC_ADDRESS = 'Sector 18, Transport Nagar, Lucknow';

  static invoiceSent(data: InvoiceTemplateData) {
    const clinic = data.clinicName || this.CLINIC_NAME;
    const phone = data.contactPhone || this.CLINIC_PHONE;
    const subject = `Invoice ${data.invoiceCode} from ${clinic}`;

    const content = `Dear ${data.patientName},

Thank you for visiting ${clinic}.

Your invoice ${data.invoiceCode} for total amount ₹${data.totalAmount} has been generated and is attached to this message.

If you have any billing inquiries, please reach out to us at ${phone}.

Warm regards,
${clinic} Billing Team`;

    return { subject, content };
  }

  static prescriptionSent(data: PrescriptionTemplateData) {
    const clinic = data.clinicName || this.CLINIC_NAME;
    const phone = data.contactPhone || this.CLINIC_PHONE;
    const subject = `Prescription ${data.prescriptionCode} from Dr. ${data.doctorName} — ${clinic}`;

    const content = `Dear ${data.patientName},

Your prescription ${data.prescriptionCode} issued by Dr. ${data.doctorName} at ${clinic} is attached to this message.

Please follow the prescribed dosage instructions carefully. For any medical queries, contact our front desk at ${phone}.

Wishing you good health,
${clinic} Medical Team`;

    return { subject, content };
  }

  static appointmentReminder(data: AppointmentReminderTemplateData) {
    const clinic = data.clinicName || this.CLINIC_NAME;
    const phone = data.contactPhone || this.CLINIC_PHONE;
    const address = data.clinicAddress || this.CLINIC_ADDRESS;
    const subject = `Appointment Reminder — ${clinic}`;

    const content = `Dear ${data.patientName},

This is a friendly reminder for your upcoming consultation with Dr. ${data.doctorName} at ${clinic}.

📅 Date: ${data.appointmentDate}
⏰ Time: ${data.appointmentTime}
📍 Location: ${address}

If you need to reschedule, please call us at ${phone} at least 4 hours prior.

We look forward to seeing you!
${clinic} Reception Team`;

    return { subject, content };
  }
}
