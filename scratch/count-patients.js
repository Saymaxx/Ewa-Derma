const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const patientCount = await prisma.patient.count();
  const appointmentCount = await prisma.appointment.count();
  const consultationCount = await prisma.consultation.count();
  const prescriptionCount = await prisma.prescription.count();
  const invoiceCount = await prisma.invoice.count();
  const patientNoteCount = await prisma.patientNote.count();
  const patientDocCount = await prisma.patientDocument.count();
  const notificationCount = await prisma.notification.count();
  const followUpCount = await prisma.followUp.count();

  console.log('--- Current Database Records ---');
  console.log('Patients:', patientCount);
  console.log('Appointments:', appointmentCount);
  console.log('Consultations:', consultationCount);
  console.log('Prescriptions:', prescriptionCount);
  console.log('Invoices:', invoiceCount);
  console.log('Patient Notes:', patientNoteCount);
  console.log('Patient Documents:', patientDocCount);
  console.log('Follow-ups:', followUpCount);
  console.log('Notifications:', notificationCount);

  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      patientCode: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\nPatients list:');
  console.log(patients);
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
