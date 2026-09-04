const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: {
      patient: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Total Invoices in Database: ${invoices.length}`);
  invoices.forEach((inv) => {
    console.log(`- ${inv.invoiceCode} | Patient: ${inv.patient.firstName} ${inv.patient.lastName} | Total: Rs. ${inv.totalAmount} | Created: ${inv.createdAt.toISOString()}`);
  });
}

main().finally(() => prisma.$disconnect());
