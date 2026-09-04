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
              resolve({ status: res.statusCode, body: parsed });
            }
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assertEnvelope(res, endpointName, isArray = false) {
  const { status, body } = res;
  if (status !== 200 && status !== 201) {
    throw new Error(`[${endpointName}] Expected status 200/201, got ${status}`);
  }
  if (!body || typeof body !== 'object') {
    throw new Error(`[${endpointName}] Body is not an object`);
  }
  if (!('data' in body) || !('error' in body) || !('meta' in body)) {
    throw new Error(`[${endpointName}] Missing standard envelope keys (data, error, meta). Keys present: ${Object.keys(body).join(', ')}`);
  }
  if (body.error !== null) {
    throw new Error(`[${endpointName}] Expected error to be null, got: ${JSON.stringify(body.error)}`);
  }

  // CRITICAL CHECK: Verify single wrapping
  if (body.data && typeof body.data === 'object') {
    if ('message' in body.data && 'data' in body.data) {
      throw new Error(`[${endpointName}] DOUBLE WRAPPING DETECTED! body.data contains { message, data }`);
    }
  }

  if (isArray && !Array.isArray(body.data)) {
    throw new Error(`[${endpointName}] Expected body.data to be an Array, but got ${typeof body.data}`);
  }

  console.log(`✅ [${endpointName}] Passed! body.data type: ${Array.isArray(body.data) ? `Array[${body.data.length}]` : typeof body.data}`);
}

async function runVerification() {
  console.log('=== DOUBLE RESPONSE WRAPPING REGRESSION TEST SUITE ===\n');

  // 1. Auth
  const adminAuth = await request('POST', '/auth/login', { identifier: 'admin@ewaderma.com', password: 'Clinic@12345' });
  const adminToken = adminAuth.body.data.accessToken;

  // 2. Invoices Controller
  const invoicesRes = await request('GET', '/invoices', null, adminToken);
  assertEnvelope(invoicesRes, 'GET /invoices', true);

  const patientsRes = await request('GET', '/patients', null, adminToken);
  const patient = patientsRes.body.data.items[0];

  const createInvoiceRes = await request('POST', '/invoices', {
    patientId: patient.id,
    items: [{ itemType: 'SERVICE', description: 'Test Consultation', quantity: 1, unitPrice: 500 }],
  }, adminToken);
  assertEnvelope(createInvoiceRes, 'POST /invoices');
  if (!createInvoiceRes.body.data.id || !createInvoiceRes.body.data.invoiceCode) {
    throw new Error('POST /invoices returned invalid data structure, missing id/invoiceCode directly on body.data');
  }

  const invoiceId = createInvoiceRes.body.data.id;
  const findOneInvoiceRes = await request('GET', `/invoices/${invoiceId}`, null, adminToken);
  assertEnvelope(findOneInvoiceRes, 'GET /invoices/:id');

  // 3. Payments & Refunds Controller
  const createPaymentRes = await request('POST', '/payments', {
    invoiceId,
    amount: 200,
    paymentMethod: 'CASH',
  }, adminToken);
  assertEnvelope(createPaymentRes, 'POST /payments');
  const paymentId = createPaymentRes.body.data.id;

  const getPaymentsRes = await request('GET', `/payments/invoice/${invoiceId}`, null, adminToken);
  assertEnvelope(getPaymentsRes, 'GET /payments/invoice/:invoiceId', true);

  const refundRes = await request('POST', '/refunds', {
    paymentId,
    amount: 100,
    reason: 'Test refund',
  }, adminToken);
  assertEnvelope(refundRes, 'POST /refunds');

  // 4. Services Controller
  const servicesRes = await request('GET', '/services', null, adminToken);
  assertEnvelope(servicesRes, 'GET /services', true);

  // 5. Medicines Controller
  const medicinesRes = await request('GET', '/medicines', null, adminToken);
  assertEnvelope(medicinesRes, 'GET /medicines', true);

  const categoriesRes = await request('GET', '/medicines/categories', null, adminToken);
  assertEnvelope(categoriesRes, 'GET /medicines/categories', true);

  // 6. Suppliers Controller
  const suppliersRes = await request('GET', '/suppliers', null, adminToken);
  assertEnvelope(suppliersRes, 'GET /suppliers', true);

  // 7. Inventory Alerts Controller
  const alertsRes = await request('GET', '/inventory/alerts', null, adminToken);
  assertEnvelope(alertsRes, 'GET /inventory/alerts');

  // 8. Purchases & Adjustments Controller
  const purchasesRes = await request('GET', '/inventory/purchases', null, adminToken);
  assertEnvelope(purchasesRes, 'GET /inventory/purchases', true);

  const adjustmentsRes = await request('GET', '/inventory/adjustments', null, adminToken);
  assertEnvelope(adjustmentsRes, 'GET /inventory/adjustments', true);

  // 9. Notifications Controller
  const notificationsRes = await request('GET', '/notifications', null, adminToken);
  assertEnvelope(notificationsRes, 'GET /notifications', true);

  // 10. Reports Controller
  const reportsRes = await request('GET', '/reports/appointments', null, adminToken);
  assertEnvelope(reportsRes, 'GET /reports/appointments');

  console.log('\n🎉 ALL CONTROLLERS PASSED RESPONSE ENVELOPE VERIFICATION!');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err.message || err);
  process.exit(1);
});
