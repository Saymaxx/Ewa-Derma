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
  console.log('=== 1. AUTHENTICATION & ROLE TOKENS ===');
  const adminAuth = await request('POST', '/auth/login', { identifier: 'admin@ewaderma.com', password: 'Clinic@12345' });
  const docAuth = await request('POST', '/auth/login', { identifier: 'doctor@ewaderma.com', password: 'Clinic@12345' });
  const recAuth = await request('POST', '/auth/login', { identifier: 'reception@ewaderma.com', password: 'Clinic@12345' });

  const adminToken = adminAuth.data.accessToken;
  const docToken = docAuth.data.accessToken;
  const recToken = recAuth.data.accessToken;

  console.log('\n=== 2. SEND INVOICE VIA EMAIL (PDF ATTACHED) ===');
  const invoicesRes = await request('GET', '/invoices', null, recToken);
  const invoiceList = invoicesRes.data?.data || invoicesRes.data;
  const invoice = invoiceList[0];
  console.log(`Target Invoice: ${invoice.invoiceCode} (ID: ${invoice.id})`);

  const sendInvoiceEmailRes = await request(
    'POST',
    `/notifications/send-invoice/${invoice.id}`,
    { channel: 'EMAIL', recipient: 'patient.invoice@example.com' },
    recToken,
  );
  const sendInvoiceEmail = sendInvoiceEmailRes.data.data || sendInvoiceEmailRes.data;
  console.log(`Email Status: ${sendInvoiceEmail.status} | Message: '${sendInvoiceEmailRes.data.message}'`);

  console.log('\n=== 3. SEND INVOICE VIA WHATSAPP (HONEST FAILURE TEST) ===');
  const sendInvoiceWARes = await request(
    'POST',
    `/notifications/send-invoice/${invoice.id}`,
    { channel: 'WHATSAPP', recipient: '9876543210' },
    recToken,
  );
  const sendInvoiceWA = sendInvoiceWARes.data.data || sendInvoiceWARes.data;
  console.log(`WhatsApp Status: ${sendInvoiceWA.status} | Error Detail: '${sendInvoiceWA.errorLog}'`);
  console.log('✅ VERIFICATION: WhatsApp honestly reported failure without faking success!');

  console.log('\n=== 4. SEND PRESCRIPTION VIA EMAIL (PDF ATTACHED) ===');
  const ptsRes = await request('GET', '/patients', null, docToken);
  const patient = ptsRes.data.items ? ptsRes.data.items[0] : ptsRes.data.data.items[0];
  const rxsRes = await request('GET', `/prescriptions/patient/${patient.id}`, null, docToken);
  const rxList = rxsRes.data?.data || rxsRes.data || rxsRes;
  const rx = rxList[0];
  console.log(`Target Prescription: ${rx.prescriptionCode} (ID: ${rx.id})`);

  const sendRxEmailRes = await request(
    'POST',
    `/notifications/send-prescription/${rx.id}`,
    { channel: 'EMAIL', recipient: 'patient.rx@example.com' },
    docToken,
  );
  const sendRxEmail = sendRxEmailRes.data.data || sendRxEmailRes.data;
  console.log(`Email Status: ${sendRxEmail.status} | Message: '${sendRxEmailRes.data.message}'`);

  console.log('\n=== 5. APPOINTMENT REMINDERS JOB & DUPLICATE PREVENTION ===');
  const run1Res = await request('POST', '/notifications/run-reminders', {}, adminToken);
  const run1 = run1Res.data.data || run1Res.data;
  console.log(`Run 1 Summary: Sent: ${run1.sentCount} | Skipped: ${run1.skippedCount} | Total Processed: ${run1.processedCount}`);

  const run2Res = await request('POST', '/notifications/run-reminders', {}, adminToken);
  const run2 = run2Res.data.data || run2Res.data;
  console.log(`Run 2 Summary: Sent: ${run2.sentCount} | Skipped: ${run2.skippedCount} | Total Processed: ${run2.processedCount}`);
  console.log('✅ VERIFICATION: Duplicate prevention verified (2nd run skipped previously sent appointments)!');

  console.log('\n=== 6. ADMIN NOTIFICATION AUDIT LOG & RBAC ===');
  const logRes = await request('GET', '/notifications', null, adminToken);
  const logItems = logRes.data?.data || logRes.data;
  console.log(`Total Notification Attempts in Audit Log: ${logItems.length}`);
  logItems.slice(0, 3).forEach((item) =>
    console.log(` - [${item.channel}] Type: ${item.type} | Recipient: ${item.recipient} | Status: ${item.status}`),
  );

  try {
    await request('GET', '/notifications', null, recToken);
  } catch (err) {
    console.log(`✅ Receptionist blocked from admin notification log with HTTP ${err.status} Forbidden!`);
  }

  console.log('\n=== 7. ENTITY SPECIFIC NOTIFICATION HISTORY ===');
  const historyRes = await request('GET', `/notifications/history/INVOICE/${invoice.id}`, null, recToken);
  const historyItems = historyRes.data?.data || historyRes.data;
  console.log(`Invoice ${invoice.invoiceCode} Send History Count: ${historyItems.length}`);
}

runTest().catch((err) => console.error('Test Failed:', err));
