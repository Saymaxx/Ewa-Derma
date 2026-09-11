const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPatientData() {
  console.log('--- Starting Complete Patient Data Cleanup ---');

  // 1. Delete dependent transactional records in correct foreign key order
  const delNotifications = await prisma.notification.deleteMany({});
  console.log(`Deleted ${delNotifications.count} notifications.`);

  const delRefunds = await prisma.refund.deleteMany({});
  console.log(`Deleted ${delRefunds.count} refunds.`);

  const delPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${delPayments.count} payments.`);

  const delInvoiceItems = await prisma.invoiceItem.deleteMany({});
  console.log(`Deleted ${delInvoiceItems.count} invoice items.`);

  const delInvoices = await prisma.invoice.deleteMany({});
  console.log(`Deleted ${delInvoices.count} invoices.`);

  const delPrescriptionItems = await prisma.prescriptionItem.deleteMany({});
  console.log(`Deleted ${delPrescriptionItems.count} prescription items.`);

  const delPrescriptions = await prisma.prescription.deleteMany({});
  console.log(`Deleted ${delPrescriptions.count} prescriptions.`);

  const delConsultations = await prisma.consultation.deleteMany({});
  console.log(`Deleted ${delConsultations.count} consultations.`);

  const delAppointments = await prisma.appointment.deleteMany({});
  console.log(`Deleted ${delAppointments.count} appointments.`);

  const delNotes = await prisma.patientNote.deleteMany({});
  console.log(`Deleted ${delNotes.count} patient notes.`);

  const delDocs = await prisma.patientDocument.deleteMany({});
  console.log(`Deleted ${delDocs.count} patient documents.`);

  const delFollowUps = await prisma.followUp.deleteMany({});
  console.log(`Deleted ${delFollowUps.count} follow-ups.`);

  const delPatients = await prisma.patient.deleteMany({});
  console.log(`Deleted ${delPatients.count} patients.`);

  // 2. Reset entity sequence counters to default starting points
  const sequences = [
    { prefix: 'P', lastNumber: 1000 },
    { prefix: 'A', lastNumber: 2000 },
    { prefix: 'RX', lastNumber: 3000 },
    { prefix: 'INV', lastNumber: 5000 },
  ];

  for (const seq of sequences) {
    await prisma.entitySequence.upsert({
      where: { prefix: seq.prefix },
      update: { lastNumber: seq.lastNumber },
      create: seq,
    });
    console.log(`Reset sequence prefix '${seq.prefix}' to start after ${seq.lastNumber}.`);
  }

  // 3. Verify database state
  const remainingPatients = await prisma.patient.count();
  const remainingAppointments = await prisma.appointment.count();
  const remainingConsultations = await prisma.consultation.count();
  const remainingPrescriptions = await prisma.prescription.count();
  const remainingInvoices = await prisma.invoice.count();
  const remainingUsers = await prisma.user.count();
  const remainingMedicines = await prisma.medicine.count();
  const remainingServices = await prisma.clinicService.count();

  console.log('\n========================================');
  console.log('✅ CLEANUP COMPLETE & DATABASE IS FRESH');
  console.log('========================================');
  console.log(`Patients in database: ${remainingPatients}`);
  console.log(`Appointments in database: ${remainingAppointments}`);
  console.log(`Consultations in database: ${remainingConsultations}`);
  console.log(`Prescriptions in database: ${remainingPrescriptions}`);
  console.log(`Invoices in database: ${remainingInvoices}`);
  console.log(`Staff Users preserved: ${remainingUsers}`);
  console.log(`Medicines in pharmacy preserved: ${remainingMedicines}`);
  console.log(`Clinic Services preserved: ${remainingServices}`);
}

cleanPatientData()
  .catch((e) => {
    console.error('Cleanup Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
