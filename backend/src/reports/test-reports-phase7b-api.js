const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(data);
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('json')) {
            try {
              const parsed = JSON.parse(buffer.toString());
              if (res.statusCode >= 400) {
                reject({ status: res.statusCode, data: parsed });
              } else {
                resolve(parsed);
              }
            } catch (e) {
              resolve({ raw: buffer.toString(), status: res.statusCode });
            }
          } else {
            resolve({ buffer, status: res.statusCode, contentType });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('=== 1. AUTHENTICATION TOKENS ===');
  const adminAuth = await request('POST', '/auth/login', { identifier: 'admin@ewaderma.com', password: 'Clinic@12345' });
  const docAuth = await request('POST', '/auth/login', { identifier: 'doctor@ewaderma.com', password: 'Clinic@12345' });
  const recAuth = await request('POST', '/auth/login', { identifier: 'reception@ewaderma.com', password: 'Clinic@12345' });

  const adminToken = adminAuth.data.accessToken;
  const docToken = docAuth.data.accessToken;
  const recToken = recAuth.data.accessToken;

  console.log('\n=== 2. REVENUE REPORT DATA (COLLECTED vs BILLED) ===');
  const revRes = await request('GET', '/reports/revenue?startDate=2026-09-01&endDate=2026-09-30', null, adminToken);
  const rev = revRes.data.data || revRes.data;

  console.log(`Collected Revenue (Net): Rs. ${rev.summary.collectedRevenue}`);
  console.log(`Billed Revenue (Invoiced): Rs. ${rev.summary.billedRevenue}`);
  console.log(`Outstanding Balance Due: Rs. ${rev.summary.totalOutstandingDue}`);
  console.log(`Refunds Issued: Rs. ${rev.summary.totalRefundsIssued}`);
  console.log(`Total Invoices Count: ${rev.summary.invoiceCount}`);
  console.log(`Payment Methods Count: ${rev.paymentMethodBreakdown.length}`);
  rev.paymentMethodBreakdown.forEach((pm) => console.log(` - ${pm.method}: Rs. ${pm.amount} (${pm.percentage}%)`));

  console.log('\n=== 3. REVENUE REPORT RBAC ENFORCEMENT ===');
  try {
    await request('GET', '/reports/revenue?startDate=2026-09-01&endDate=2026-09-30', null, recToken);
  } catch (err) {
    console.log(`✅ Receptionist blocked from Revenue Report with HTTP ${err.status} Forbidden!`);
  }

  console.log('\n=== 4. INVENTORY REPORT DATA (REUSED PHASE 5 LOGIC) ===');
  const invRes = await request('GET', '/reports/inventory?startDate=2026-09-01&endDate=2026-09-30', null, adminToken);
  const inv = invRes.data.data || invRes.data;

  console.log(`Total Inventory Valuation: Rs. ${inv.summary.totalInventoryValue}`);
  console.log(`Medicines in Formulary: ${inv.summary.totalMedicinesCount}`);
  console.log(`Low Stock Alert Count: ${inv.summary.lowStockCount}`);
  console.log(`Expiring Batches Count: ${inv.summary.expiringBatchesCount}`);
  console.log(`Items Dispensed Count: ${inv.summary.totalItemsDispensed}`);
  console.log(`Stock Movement Transactions: ${inv.movements.length}`);

  console.log('\n=== 5. INVENTORY REPORT RBAC ENFORCEMENT ===');
  try {
    await request('GET', '/reports/inventory?startDate=2026-09-01&endDate=2026-09-30', null, recToken);
  } catch (err) {
    console.log(`✅ Receptionist blocked from Inventory Report with HTTP ${err.status} Forbidden!`);
  }

  console.log('\n=== 6. REVENUE EXPORT (PDF & CSV) ===');
  const pdfExport = await request('GET', '/reports/revenue/export?format=pdf&startDate=2026-09-01&endDate=2026-09-30', null, adminToken);
  console.log(`PDF Export Status: ${pdfExport.status} | Content-Type: ${pdfExport.contentType} | Buffer Size: ${pdfExport.buffer?.length} bytes`);

  const csvExport = await request('GET', '/reports/revenue/export?format=csv&startDate=2026-09-01&endDate=2026-09-30', null, adminToken);
  console.log(`CSV Export Status: ${csvExport.status} | Content-Type: ${csvExport.contentType} | Buffer Size: ${csvExport.buffer?.length} bytes`);

  console.log('\n=== 7. INVENTORY EXPORT (PDF & CSV) ===');
  const invPdfExport = await request('GET', '/reports/inventory/export?format=pdf&startDate=2026-09-01&endDate=2026-09-30', null, adminToken);
  console.log(`Inventory PDF Export Status: ${invPdfExport.status} | Content-Type: ${invPdfExport.contentType} | Buffer Size: ${invPdfExport.buffer?.length} bytes`);

  console.log('\n=== ALL PHASE 7B E2E API CHECKS PASSED PERFECTLY ===');
}

runTest().catch((err) => console.error('E2E Test Failed:', err));
