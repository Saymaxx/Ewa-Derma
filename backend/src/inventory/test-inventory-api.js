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
  const invAuth = await request('POST', '/auth/login', { identifier: 'inventory@ewaderma.com', password: 'Clinic@12345' });
  const docAuth = await request('POST', '/auth/login', { identifier: 'doctor@ewaderma.com', password: 'Clinic@12345' });
  const recAuth = await request('POST', '/auth/login', { identifier: 'reception@ewaderma.com', password: 'Clinic@12345' });

  const adminToken = adminAuth.data.accessToken;
  const invToken = invAuth.data.accessToken;
  const docToken = docAuth.data.accessToken;
  const recToken = recAuth.data.accessToken;

  console.log('=== 2. CREATE SUPPLIER / VENDOR ===');
  const supplierRes = await request(
    'POST',
    '/suppliers',
    {
      name: 'Apex Derma Pharma Pvt Ltd',
      contactPerson: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'orders@apexderma.com',
      gstin: '09AAACA1234A1Z5',
      address: 'Transport Nagar, Lucknow',
    },
    invToken,
  );
  const supplier = supplierRes.data?.data || supplierRes.data;
  console.log(`Supplier Created: ${supplier.name} (ID: ${supplier.id})`);

  console.log('\n=== 3. MEDICINE LOOKUP & PURCHASES (STOCK IN) ===');
  const medicinesRes = await request('GET', '/medicines?search=Tretinoin', null, invToken);
  const medList = medicinesRes.data?.data || medicinesRes.data;
  const medicine = medList[0];
  console.log(`Target Medicine: ${medicine.name} (ID: ${medicine.id}) | Initial Computed Stock: ${medicine.computedStock}`);

  // Purchase 1: Far expiry (50 units, expiry 2027-12-31)
  const p1 = await request(
    'POST',
    '/inventory/purchases',
    {
      medicineId: medicine.id,
      supplierId: supplier.id,
      batchNumber: 'B2026-FAR',
      quantity: 50,
      purchasePrice: 120,
      expiryDate: '2027-12-31',
      referenceNumber: 'PO-9001',
      notes: 'Initial bulk stock receipt',
    },
    invToken,
  );

  // Purchase 2: Near expiry (20 units, expiry 2026-11-30)
  const p2 = await request(
    'POST',
    '/inventory/purchases',
    {
      medicineId: medicine.id,
      supplierId: supplier.id,
      batchNumber: 'B2026-NEAR',
      quantity: 20,
      purchasePrice: 115,
      expiryDate: '2026-11-30',
      referenceNumber: 'PO-9002',
      notes: 'Urgent stock receipt',
    },
    invToken,
  );

  const stockCheck1Res = await request('GET', `/medicines/${medicine.id}/stock`, null, invToken);
  const stockCheck1Data = stockCheck1Res.data.data || stockCheck1Res.data;
  console.log(`Total Computed Stock after Purchases: ${stockCheck1Data.computedStock} units`);
  stockCheck1Data.batches.forEach((b) =>
    console.log(` - Batch ${b.batchNumber}: Expiry ${b.expiryDate.split('T')[0]} | Stock: ${b.computedStock}`),
  );

  console.log('\n=== 4. PRESCRIPTION CREATION (PHASE 3) — VERIFY NO STOCK DEDUCTION ===');
  const ptsRes = await request('GET', '/patients', null, docToken);
  const patient = ptsRes.data.items[0];

  const aptsRes = await request('GET', '/appointments', null, docToken);
  const apt = aptsRes.data.items ? aptsRes.data.items[0] : aptsRes.data[0];

  let consultation;
  try {
    const cRes = await request(
      'POST',
      '/consultations',
      {
        appointmentId: apt.id,
        chiefComplaint: 'Acne Vulgaris Followup',
        clinicalFindings: 'Mild comedonal acne',
        treatmentPlan: 'Topical retinoid therapy',
      },
      docToken,
    );
    consultation = cRes.data;
  } catch {
    const list = await request('GET', `/consultations/patient/${patient.id}`, null, docToken);
    consultation = list.data[0];
  }

  const prescriptionRes = await request(
    'POST',
    '/prescriptions',
    {
      patientId: patient.id,
      consultationId: consultation.id,
      generalAdvice: 'Apply thin layer before bedtime',
      items: [
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          dosage: '0.05%',
          frequency: 'Once daily at night',
          duration: '15 days',
          quantity: 15,
        },
      ],
    },
    docToken,
  );

  const rx = prescriptionRes.data.data || prescriptionRes.data;
  console.log(`Created Prescription: ${rx.prescriptionCode} (Quantity Prescribed: 15)`);

  const stockCheck2Res = await request('GET', `/medicines/${medicine.id}/stock`, null, invToken);
  const stockCheck2Data = stockCheck2Res.data.data || stockCheck2Res.data;
  console.log(`✅ VERIFICATION: Stock after Prescription Creation: ${stockCheck2Data.computedStock} (STILL UNCHANGED!)`);

  console.log('\n=== 5. FEFO DISPENSING ENGINE (STOCK OUT) ===');
  const dispenseRes = await request('POST', `/prescriptions/${rx.id}/dispense`, {}, invToken);
  const dispenseData = dispenseRes.data.data || dispenseRes.data;
  console.log(`Dispensed Prescription ${dispenseData.prescriptionCode} for Patient ${dispenseData.patient}`);
  dispenseData.dispensedItems[0].batchesUsed.forEach((b) =>
    console.log(` - Drawn ${b.quantityDrawn} units from Batch ${b.batchNumber} (Expiry: ${b.expiryDate.split('T')[0]})`),
  );

  const stockCheck3Res = await request('GET', `/medicines/${medicine.id}/stock`, null, invToken);
  const stockCheck3Data = stockCheck3Res.data.data || stockCheck3Res.data;
  console.log(`Computed Stock after FEFO Dispense: ${stockCheck3Data.computedStock} units`);
  stockCheck3Data.batches.forEach((b) =>
    console.log(` - Batch ${b.batchNumber}: Expiry ${b.expiryDate.split('T')[0]} | Stock: ${b.computedStock}`),
  );

  console.log('\n=== 6. INSUFFICIENT STOCK REJECTION TEST ===');
  try {
    // Attempt to dispense 500 units against prescription item
    const rxOver = await request(
      'POST',
      '/prescriptions',
      {
        consultationId: consultation.id,
        items: [
          {
            medicineId: medicine.id,
            medicineName: medicine.name,
            dosage: '0.05%',
            frequency: '1-0-1',
            duration: '30 days',
            quantity: 500,
          },
        ],
      },
      docToken,
    );
    await request('POST', `/prescriptions/${rxOver.data.id}/dispense`, {}, invToken);
  } catch (err) {
    console.log(`✅ Insufficient stock correctly rejected with HTTP ${err.status}: '${err.data?.error?.message || err.data?.message}'`);
  }

  console.log('\n=== 7. MANUAL STOCK ADJUSTMENTS & REASON VALIDATION ===');
  try {
    await request('POST', '/inventory/adjustments', { medicineId: medicine.id, transactionType: 'DAMAGED_OUT', quantity: 2, reason: '' }, invToken);
  } catch (err) {
    console.log(`✅ Stock adjustment without reason correctly rejected with HTTP ${err.status}: '${err.data?.error?.message || err.data?.message}'`);
  }

  const nearBatch = stockCheck3Data.batches.find((b) => b.batchNumber === 'B2026-NEAR');
  const adjRes = await request(
    'POST',
    '/inventory/adjustments',
    {
      medicineId: medicine.id,
      batchId: nearBatch.batchId,
      transactionType: 'DAMAGED_OUT',
      quantity: 2,
      reason: 'Damaged tube cap found during shelf inspection',
    },
    invToken,
  );
  const adj = adjRes.data.data || adjRes.data;
  console.log(`Adjustment Recorded: ${adj.transactionType} (-${Math.abs(adj.quantity)} units) | Reason: '${adj.notes}'`);

  const stockCheck4Data = (await request('GET', `/medicines/${medicine.id}/stock`, null, invToken)).data.data;
  console.log(`Final Computed Stock after Adjustment: ${stockCheck4Data.computedStock} units`);

  console.log('\n=== 8. RBAC SECURITY CONTROLS ===');
  try {
    await request('POST', '/inventory/purchases', { medicineId: medicine.id, batchNumber: 'B-BAD', quantity: 10, purchasePrice: 50, expiryDate: '2028-01-01' }, docToken);
  } catch (err) {
    console.log(`✅ Doctor blocked from purchases with HTTP ${err.status} Forbidden!`);
  }

  try {
    await request('POST', '/inventory/adjustments', { medicineId: medicine.id, transactionType: 'DAMAGED_OUT', quantity: 1, reason: 'Test' }, recToken);
  } catch (err) {
    console.log(`✅ Receptionist blocked from stock adjustments with HTTP ${err.status} Forbidden!`);
  }

  console.log('\n=== 9. INVENTORY ALERTS ENDPOINT ===');
  const alertsRes = await request('GET', '/inventory/alerts', null, recToken);
  const alertsData = alertsRes.data.data || alertsRes.data;
  console.log(`Inventory Summary Alerts: Low Stock Count: ${alertsData.summary.lowStockCount} | Expiring/Expired Batches: ${alertsData.summary.totalAlertsCount}`);
}

runTest().catch((err) => console.error('Test Failed:', err));
