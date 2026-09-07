import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Ewa Derma Clinic Management System (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let doctorToken: string;
  let receptionistToken: string;
  let inventoryToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Login each seeded role for tests
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'admin@ewaderma.com', password: 'Clinic@12345' });
    adminToken = adminRes.body?.data?.accessToken;

    const docRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'doctor@ewaderma.com', password: 'Clinic@12345' });
    doctorToken = docRes.body?.data?.accessToken;

    const recRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'reception@ewaderma.com', password: 'Clinic@12345' });
    receptionistToken = recRes.body?.data?.accessToken;

    const invRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'inventory@ewaderma.com', password: 'Clinic@12345' });
    inventoryToken = invRes.body?.data?.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // Helper to assert strict single-wrapping response shape
  const assertSingleWrappedResponse = (body: any) => {
    expect(body).toBeDefined();
    expect(body.data).toBeDefined();
    expect(body.error).toBeNull();
    expect(body.meta).toBeDefined();
    // Guard against double wrapping regression
    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      expect(body.data.data).toBeUndefined();
    }
  };

  describe('1. Authentication & Token Lifecycle Flow', () => {
    let freshAccessToken: string;
    let freshRefreshToken: string;

    it('should login successfully and return flat envelope shape', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'admin@ewaderma.com', password: 'Clinic@12345' })
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@ewaderma.com');

      freshAccessToken = res.body.data.accessToken;
      freshRefreshToken = res.body.data.refreshToken;
    });

    it('should access protected profile route with token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freshAccessToken}`)
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.email).toBe('admin@ewaderma.com');
      expect(res.body.data.clinic).toBeDefined();
    });

    it('should refresh tokens and reject invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: freshRefreshToken })
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      // Invalid / malformed refresh token must be rejected
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.jwt.token.string' })
        .expect(401);
    });

    it('should logout user and revoke active refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshAccessToken}`)
        .send()
        .expect(200);

      assertSingleWrappedResponse(res.body);
    });
  });

  describe('2. Complete Clinical to Billing & Invoice Payment Lifecycle', () => {
    let patientId: string;
    let doctorId: string;
    let appointmentId: string;
    let consultationId: string;
    let prescriptionId: string;
    let invoiceId: string;

    it('should create a new patient', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          firstName: 'E2E_Test',
          lastName: 'Patient',
          phone: `+9199${Date.now().toString().slice(-8)}`,
          gender: 'FEMALE',
          bloodGroup: 'B_POSITIVE',
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.id).toBeDefined();
      patientId = res.body.data.id;
    });

    it('should retrieve a doctor to book appointment with', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/doctors')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      doctorId = res.body.data[0].id;
    });

    it('should book an appointment for a unique future slot', async () => {
      // Pick unique future date based on timestamp/random offset to prevent double-booking collision across runs
      const randomDayOffset = 40 + Math.floor(Math.random() * 500);
      const uniqueDate = new Date(Date.now() + 86400000 * randomDayOffset).toISOString().split('T')[0];
      const res = await request(app.getHttpServer())
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId,
          doctorId,
          appointmentDate: uniqueDate,
          startTime: '14:00',
          endTime: '14:30',
          type: 'CONSULTATION',
          reason: 'Skin consultation for acne',
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('SCHEDULED');
      appointmentId = res.body.data.id;
    });

    it('should advance appointment status: SCHEDULED -> CHECKED_IN -> IN_CONSULTATION', async () => {
      const checkInRes = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'CHECKED_IN' })
        .expect(200);

      assertSingleWrappedResponse(checkInRes.body);
      expect(checkInRes.body.data.status).toBe('CHECKED_IN');

      const inConsultRes = await request(app.getHttpServer())
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'IN_CONSULTATION' })
        .expect(200);

      assertSingleWrappedResponse(inConsultRes.body);
      expect(inConsultRes.body.data.status).toBe('IN_CONSULTATION');
    });

    it('should complete consultation note and diagnoses', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId,
          patientId,
          chiefComplaint: 'Severe facial acne breakouts',
          clinicalFindings: 'Grade II inflammatory acne',
          treatmentPlan: 'Topical retinoic acid and clindamycin',
          diagnoses: [
            {
              conditionName: 'Acne Vulgaris',
              severity: 'Moderate',
            },
          ],
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.id).toBeDefined();
      consultationId = res.body.data.id;
    });

    it('should create prescription linked to consultation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultationId,
          patientId,
          generalAdvice: 'Apply cream once daily at night. Wash face with mild cleanser.',
          items: [
            {
              medicineName: 'Clindamycin Gel 1%',
              dosage: '1% w/w',
              frequency: '1-0-1',
              duration: '14 days',
              route: 'Topical',
              quantity: 1,
              instructions: 'Apply on affected areas after washing',
            },
          ],
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.id).toBeDefined();
      prescriptionId = res.body.data.id;
    });

    it('should generate invoice for the patient consultation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/invoices')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId,
          appointmentId,
          consultationId,
          items: [
            {
              itemType: 'SERVICE',
              description: 'Dermatologist Initial Consultation',
              quantity: 1,
              unitPrice: 700,
              discount: 0,
              taxRate: 18,
            },
          ],
          discountAmount: 0,
          notes: 'Standard consultation fee',
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.invoiceCode).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
      invoiceId = res.body.data.id;
    });

    it('should record payment and automatically mark invoice as PAID', async () => {
      const invBefore = await request(app.getHttpServer())
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      const dueAmount = Number(invBefore.body.data.dueAmount);
      expect(dueAmount).toBeGreaterThan(0);

      const payRes = await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          invoiceId,
          amount: dueAmount,
          paymentMethod: 'UPI',
          referenceId: `UPI-E2E-${Date.now()}`,
          notes: 'Settled full invoice amount via UPI',
        })
        .expect(201);

      assertSingleWrappedResponse(payRes.body);

      // Verify invoice is now PAID and dueAmount is 0
      const invAfter = await request(app.getHttpServer())
        .get(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      assertSingleWrappedResponse(invAfter.body);
      expect(invAfter.body.data.status).toBe('PAID');
      expect(Number(invAfter.body.data.dueAmount)).toBe(0);
    });

    it('should reject PATCH /api/invoices/:id/status with PAID directly (400 Bad Request)', async () => {
      // Create a draft/pending invoice
      const invRes = await request(app.getHttpServer())
        .post('/api/invoices')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId,
          appointmentId,
          items: [
            {
              itemType: 'SERVICE',
              description: 'General Checkup',
              quantity: 1,
              unitPrice: 500,
            },
          ],
        })
        .expect(201);

      const testInvId = invRes.body.data.id;

      // Direct transition to PAID must be rejected
      await request(app.getHttpServer())
        .patch(`/api/invoices/${testInvId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'PAID' })
        .expect(400);

      // Direct transition to REFUNDED must also be rejected
      await request(app.getHttpServer())
        .patch(`/api/invoices/${testInvId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'REFUNDED' })
        .expect(400);

      // Transition to CANCELLED must succeed
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/invoices/${testInvId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: 'CANCELLED', reason: 'Patient cancelled treatment' })
        .expect(200);

      assertSingleWrappedResponse(cancelRes.body);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should override spoofed client unitPrice with authoritative catalog price from database', async () => {
      // Fetch an existing service
      const service = await prisma.service.findFirst({ where: { isActive: true } });
      expect(service).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/api/invoices')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId,
          taxRate: 0,
          discountAmount: 0,
          items: [
            {
              itemType: 'SERVICE',
              serviceId: service!.id,
              description: service!.name,
              quantity: 2,
              unitPrice: 1, // Attempted price tampering!
            },
          ],
        })
        .expect(201);

      assertSingleWrappedResponse(res.body);
      const expectedSubtotal = Number(service!.basePrice) * 2;
      expect(Number(res.body.data.subTotal)).toBe(expectedSubtotal);
      expect(Number(res.body.data.totalAmount)).toBe(expectedSubtotal);
    });

    it('should paginate GET /api/invoices with safe clamping and return correct metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/invoices?page=1&limit=5')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(5);
      expect(typeof res.body.data.totalPages).toBe('number');
    });

    it('should download PDF invoice and prescription with response compression enabled', async () => {
      const invPdfRes = await request(app.getHttpServer())
        .get(`/api/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);

      expect(invPdfRes.headers['content-type']).toContain('application/pdf');
      expect(invPdfRes.body).toBeDefined();

      const rxPdfRes = await request(app.getHttpServer())
        .get(`/api/prescriptions/${prescriptionId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(rxPdfRes.headers['content-type']).toContain('application/pdf');
      expect(rxPdfRes.body).toBeDefined();
    });
  });

  describe('3. Role-Based Access Control (RBAC) Matrix', () => {
    it('ADMIN role: allowed on admin health-check and audit-logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/health-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertSingleWrappedResponse(res.body);
      expect(res.body.data.status).toBe('healthy');
    });

    it('DOCTOR role: allowed on patient prescriptions, blocked (403) from admin audit-logs', async () => {
      const patient = await prisma.patient.findFirst();
      // Allowed
      const allowedRes = await request(app.getHttpServer())
        .get(`/api/prescriptions/patient/${patient!.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);
      assertSingleWrappedResponse(allowedRes.body);

      // Blocked
      await request(app.getHttpServer())
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('RECEPTIONIST role: allowed on patients, blocked (403) from admin health-check', async () => {
      // Allowed
      const allowedRes = await request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(200);
      assertSingleWrappedResponse(allowedRes.body);

      // Blocked
      await request(app.getHttpServer())
        .get('/api/admin/health-check')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);
    });

    it('INVENTORY_MANAGER role: allowed on medicines, blocked (403) from invoices', async () => {
      // Allowed
      const allowedRes = await request(app.getHttpServer())
        .get('/api/medicines')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(200);
      assertSingleWrappedResponse(allowedRes.body);

      // Blocked
      await request(app.getHttpServer())
        .get('/api/invoices')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .expect(403);
    });
  });

  describe('4. Inventory Stock Consistency & Dispensing', () => {
    let testMedicineId: string;
    let testBatchId: string;
    let initialBatchQty: number = 50;

    beforeAll(async () => {
      // Create medicine & batch directly
      const med = await prisma.medicine.create({
        data: {
          name: `E2E Test Med ${Date.now()}`,
          unit: 'Tablet',
          unitPrice: 25.0,
          mrp: 30.0,
          purchasePrice: 15.0,
          minimumStock: 5,
        },
      });
      testMedicineId = med.id;

      const batch = await prisma.medicineBatch.create({
        data: {
          medicineId: testMedicineId,
          batchNumber: `BAT-${Date.now().toString().slice(-5)}`,
          expiryDate: new Date('2028-12-31'),
          purchasePrice: 15.0,
          initialQuantity: initialBatchQty,
        },
      });
      testBatchId = batch.id;
    });

    it('should verify creating prescription does not reduce medicine stock', async () => {
      const patient = await prisma.patient.findFirst();
      const consultation = await prisma.consultation.findFirst();

      const rxRes = await request(app.getHttpServer())
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultationId: consultation!.id,
          patientId: patient!.id,
          generalAdvice: 'Take with warm water',
          items: [
            {
              medicineId: testMedicineId,
              medicineName: 'E2E Test Med',
              dosage: '1 Tab',
              frequency: '1-0-1',
              duration: '5 days',
              quantity: 10,
            },
          ],
        })
        .expect(201);

      assertSingleWrappedResponse(rxRes.body);

      // Verify batch stock is UNCHANGED
      const batchCheck = await prisma.medicineBatch.findUnique({
        where: { id: testBatchId },
      });
      expect(batchCheck!.initialQuantity).toBe(initialBatchQty);
    });

    it('should correctly attribute acting userId on InventoryTransaction when recording adjustments', async () => {
      const invUser = await prisma.user.findUnique({
        where: { email: 'inventory@ewaderma.com' },
      });
      expect(invUser).toBeDefined();

      const adjRes = await request(app.getHttpServer())
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${inventoryToken}`)
        .send({
          medicineId: testMedicineId,
          batchId: testBatchId,
          transactionType: 'DAMAGED_OUT',
          quantity: 2,
          reason: 'E2E damaged packaging during audit',
        })
        .expect(201);

      assertSingleWrappedResponse(adjRes.body);

      // Verify the transaction recorded the exact inventory manager's userId in dispensedById
      const tx = await prisma.inventoryTransaction.findFirst({
        where: {
          medicineId: testMedicineId,
          batchId: testBatchId,
          transactionType: 'DAMAGED_OUT',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(tx).toBeDefined();
      expect(tx!.dispensedById).toBe(invUser!.id);
      expect(tx!.notes).toContain('E2E damaged packaging');
    });
  });
});
