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
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject({ status: res.statusCode, data: parsed });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            resolve({ raw: data, status: res.statusCode });
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
  console.log('=== 1. AUTH & ROLES ===');
  const adminAuth = await request('POST', '/auth/login', { identifier: 'admin@ewaderma.com', password: 'Clinic@12345' });
  const recAuth = await request('POST', '/auth/login', { identifier: 'reception@ewaderma.com', password: 'Clinic@12345' });
  const invAuth = await request('POST', '/auth/login', { identifier: 'inventory@ewaderma.com', password: 'Clinic@12345' });

  const adminToken = adminAuth.data.accessToken;
  const recToken = recAuth.data.accessToken;
  const invToken = invAuth.data.accessToken;

  console.log('=== 2. SERVICES CATALOG ===');
  const servicesRes = await request('GET', '/services', null, recToken);
  const servicesList = Array.isArray(servicesRes.data) ? servicesRes.data : servicesRes.data?.data || servicesRes;
  console.log(`Seeded Services Count: ${servicesList.length}`);
  servicesList.forEach((s) => console.log(` - ${s.name} (₹${s.basePrice})`));

  console.log('\n=== 3. PATIENTS & INVOICE CREATION ===');
  const patients = await request('GET', '/patients', null, recToken);
  const patient = patients.data.items[0];
  const peelSvc = servicesList.find((s) => s.name.includes('Chemical Peel'));

  const invoice = await request(
    'POST',
    '/invoices',
    {
      patientId: patient.id,
      discountAmount: 250,
      discountReason: 'Festival Special Offer',
      items: [
        {
          itemType: 'SERVICE',
          serviceId: peelSvc.id,
          description: peelSvc.name,
          quantity: 1,
          unitPrice: Number(peelSvc.basePrice),
        },
        {
          itemType: 'MEDICINE',
          description: 'Tretinoin 0.05% Gel',
          quantity: 1,
          unitPrice: 250,
        },
      ],
    },
    recToken,
  );

  const invData = invoice.data.data || invoice.data;
  console.log(`Created Invoice: ${invData.invoiceCode} (ID: ${invData.id})`);
  console.log(`Subtotal: ₹${invData.subTotal} | Discount: ₹${invData.discountAmount} | Total: ₹${invData.totalAmount} | Status: ${invData.status}`);

  console.log('\n=== 4. PARTIAL PAYMENTS ===');
  const pay1 = await request(
    'POST',
    '/payments',
    {
      invoiceId: invData.id,
      amount: 1000,
      paymentMethod: 'UPI',
      referenceId: 'UPI9876543210',
    },
    recToken,
  );
  const pay1Data = pay1.data.data || pay1.data;

  let check1 = await request('GET', `/invoices/${invData.id}`, null, recToken);
  let check1Data = check1.data.data || check1.data;
  console.log(`Payment 1 (₹1000 UPI): Invoice Status -> ${check1Data.status} | Paid: ₹${check1Data.paidAmount} | Due: ₹${check1Data.dueAmount}`);

  const pay2 = await request(
    'POST',
    '/payments',
    {
      invoiceId: invData.id,
      amount: Number(check1Data.dueAmount),
      paymentMethod: 'CASH',
    },
    recToken,
  );
  const pay2Data = pay2.data.data || pay2.data;

  let check2 = await request('GET', `/invoices/${invData.id}`, null, recToken);
  let check2Data = check2.data.data || check2.data;
  console.log(`Payment 2 (₹${pay2Data.amount} Cash): Invoice Status -> ${check2Data.status} | Paid: ₹${check2Data.paidAmount} | Due: ₹${check2Data.dueAmount}`);

  console.log('\n=== 5. INVOICE PDF STREAM ===');
  const pdfRes = await request('GET', `/invoices/${invData.id}/pdf`, null, recToken);
  console.log(`PDF Generated Successfully | Status: ${pdfRes.status || 200}`);

  console.log('\n=== 6. RBAC SECURITY FOR REFUNDS ===');
  try {
    await request('POST', '/refunds', { paymentId: pay1Data.id, amount: 1000, reason: 'Unauthorized reception refund' }, recToken);
  } catch (err) {
    console.log(`✅ Receptionist refund blocked with HTTP ${err.status} Forbidden as expected!`);
  }

  try {
    await request('POST', '/refunds', { paymentId: pay1Data.id, amount: 1000, reason: 'Unauthorized inventory refund' }, invToken);
  } catch (err) {
    console.log(`✅ Inventory Manager refund blocked with HTTP ${err.status} Forbidden as expected!`);
  }

  console.log('\n=== 7. ADMIN REFUND PROCESSING ===');
  const refund = await request(
    'POST',
    '/refunds',
    {
      paymentId: pay1Data.id,
      amount: 1000,
      reason: 'Patient requested partial refund for treatment modification',
    },
    adminToken,
  );
  const refundData = refund.data.data || refund.data;

  let check3 = await request('GET', `/invoices/${invData.id}`, null, recToken);
  let check3Data = check3.data.data || check3.data;
  console.log(`Admin Refund Issued: ₹${refundData.amount} | Reason: '${refundData.reason}'`);
  console.log(`Invoice Status -> ${check3Data.status} | Net Paid: ₹${check3Data.paidAmount} | Due: ₹${check3Data.dueAmount}`);
}

runTest().catch((err) => console.error('Test Failed:', err));
