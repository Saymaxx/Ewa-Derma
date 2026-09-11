const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.count();
  const appointments = await prisma.appointment.count();
  const consultations = await prisma.consultation.count();
  const prescriptions = await prisma.prescription.count();
  const invoices = await prisma.invoice.count();
  const users = await prisma.user.count();
  const medicines = await prisma.medicine.count();
  const services = await prisma.service.count();
  const sequences = await prisma.entitySequence.findMany();

  console.log('--- Current Database Verification ---');
  console.log(`Patients: ${patients}`);
  console.log(`Appointments: ${appointments}`);
  console.log(`Consultations: ${consultations}`);
  console.log(`Prescriptions: ${prescriptions}`);
  console.log(`Invoices: ${invoices}`);
  console.log(`Staff Users: ${users}`);
  console.log(`Medicines: ${medicines}`);
  console.log(`Services: ${services}`);
  console.log('\nSequences:', sequences);
}

main().catch(console.error).finally(() => prisma.$disconnect());
