import { PrismaClient, RoleName, Gender, BloodGroup } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Ewa Derma Clinic Management System...');

  // 1. Seed Roles
  console.log('Creating roles...');
  const rolesData: { name: RoleName; displayName: string; description: string }[] = [
    {
      name: RoleName.ADMIN,
      displayName: 'Administrator',
      description: 'Full system access, user management, clinic settings, and advanced reports',
    },
    {
      name: RoleName.DOCTOR,
      displayName: 'Doctor / Dermatologist',
      description: 'Clinical workflows, patient consultations, prescriptions, and private notes',
    },
    {
      name: RoleName.RECEPTIONIST,
      displayName: 'Receptionist / Front Desk',
      description: 'Patient registration, appointment scheduling, billing, and front desk queue',
    },
    {
      name: RoleName.INVENTORY_MANAGER,
      displayName: 'Inventory Manager',
      description: 'Pharmacy catalog, suppliers, stock batches, expiry tracking, and dispensing',
    },
  ];

  const roleMap = new Map<RoleName, string>();
  for (const role of rolesData) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
    roleMap.set(role.name, createdRole.id);
  }

  // 2. Seed Permissions
  console.log('Creating permissions...');
  const permissionsData = [
    { action: 'manage', subject: 'all', description: 'Full administrative control' },
    { action: 'read', subject: 'patient', description: 'View patient records' },
    { action: 'create', subject: 'patient', description: 'Register new patients' },
    { action: 'update', subject: 'patient', description: 'Update patient details' },
    { action: 'read', subject: 'appointment', description: 'View appointments and calendar' },
    { action: 'create', subject: 'appointment', description: 'Book appointments' },
    { action: 'update', subject: 'appointment', description: 'Update appointment status' },
    { action: 'read', subject: 'clinical', description: 'View clinical consultations and history' },
    { action: 'create', subject: 'clinical', description: 'Create consultation records and diagnoses' },
    { action: 'read', subject: 'doctor_notes', description: 'Access private doctor clinical notes' },
    { action: 'create', subject: 'prescription', description: 'Generate medical prescriptions' },
    { action: 'read', subject: 'prescription', description: 'View prescriptions' },
    { action: 'read', subject: 'billing', description: 'View invoices and receipts' },
    { action: 'create', subject: 'billing', description: 'Create invoices and collect payments' },
    { action: 'manage', subject: 'inventory', description: 'Manage medicines, batches, and suppliers' },
    { action: 'dispense', subject: 'inventory', description: 'Dispense medicines against prescriptions' },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { action_subject: { action: perm.action, subject: perm.subject } },
      update: { description: perm.description },
      create: perm,
    });
  }

  // 3. Seed Entity Sequences
  console.log('Setting up entity ID sequences...');
  const sequences = [
    { prefix: 'P', lastNumber: 1000 },
    { prefix: 'A', lastNumber: 2000 },
    { prefix: 'RX', lastNumber: 3000 },
    { prefix: 'INV', lastNumber: 5000 },
  ];

  for (const seq of sequences) {
    await prisma.entitySequence.upsert({
      where: { prefix: seq.prefix },
      update: {},
      create: seq,
    });
  }

  // 4. Seed Clinic Settings (Real Ewa Derma Details)
  console.log('Seeding clinic settings...');
  const existingSettings = await prisma.clinicSetting.findFirst();
  if (!existingSettings) {
    await prisma.clinicSetting.create({
      data: {
        clinicName: 'Ewa Derma Clinic',
        address:
          '6th Floor, Unit No. 10, The Millennium Place, near Lulu Mall, Golf City, Sector B, Ansal API, Lucknow, Uttar Pradesh 226030',
        contactNumber: '0120-5244840',
        email: null,
        gstNumber: null,
        openingTime: '10:00',
        closingTime: '19:00',
        operatingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        slotDuration: 30,
        taxRate: 0.0,
      },
    });
  }

  // 5. Seed Users for each of the 4 roles
  console.log('Creating default users with Argon2 password hashes...');
  const defaultPassword = await argon2.hash('Clinic@12345');

  const usersData = [
    {
      email: 'admin@ewaderma.com',
      username: 'admin',
      firstName: 'Clinic',
      lastName: 'Administrator',
      role: RoleName.ADMIN,
      phone: '0120-5244840',
    },
    {
      email: 'doctor@ewaderma.com',
      username: 'dr.sharma',
      firstName: 'Dr. A',
      lastName: 'Sharma',
      role: RoleName.DOCTOR,
      phone: '9876543210',
      doctorProfile: {
        specialization: 'Dermatologist',
        qualification: 'MBBS, MD (Dermatology)',
        regNumber: 'UPMC-78452',
        consultationFee: 500.0,
        workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        workingHours: '10:00-19:00',
      },
    },
    {
      email: 'doctor2@ewaderma.com',
      username: 'dr.singh',
      firstName: 'Dr. B',
      lastName: 'Singh',
      role: RoleName.DOCTOR,
      phone: '9876543211',
      doctorProfile: {
        specialization: 'Dermatologist / Cosmetologist',
        qualification: 'MBBS, DVD, FAM',
        regNumber: 'UPMC-89124',
        consultationFee: 500.0,
        workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        workingHours: '10:00-19:00',
      },
    },
    {
      email: 'reception@ewaderma.com',
      username: 'reception',
      firstName: 'Front Desk',
      lastName: 'Receptionist',
      role: RoleName.RECEPTIONIST,
      phone: '0120-5244840',
    },
    {
      email: 'inventory@ewaderma.com',
      username: 'inventory',
      firstName: 'Pharmacy',
      lastName: 'Manager',
      role: RoleName.INVENTORY_MANAGER,
      phone: '9876543212',
    },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        phoneNumber: u.phone,
        passwordHash: defaultPassword,
        isActive: true,
      },
      create: {
        email: u.email,
        username: u.username,
        passwordHash: defaultPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phone,
        isActive: true,
      },
    });

    // Assign Role
    const roleId = roleMap.get(u.role)!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });

    // Create Doctor profile if applicable
    if (u.doctorProfile) {
      await prisma.doctor.upsert({
        where: { userId: user.id },
        update: {
          specialization: u.doctorProfile.specialization,
          qualification: u.doctorProfile.qualification,
          regNumber: u.doctorProfile.regNumber,
          consultationFee: u.doctorProfile.consultationFee,
          workingDays: u.doctorProfile.workingDays,
          workingHours: u.doctorProfile.workingHours,
        },
        create: {
          userId: user.id,
          specialization: u.doctorProfile.specialization,
          qualification: u.doctorProfile.qualification,
          regNumber: u.doctorProfile.regNumber,
          consultationFee: u.doctorProfile.consultationFee,
          workingDays: u.doctorProfile.workingDays,
          workingHours: u.doctorProfile.workingHours,
        },
      });
    }
  }

  // 6. Seed Initial Services
  console.log('Seeding initial clinical services...');
  const servicesData = [
    { name: 'Consultation', category: 'Consultation', basePrice: 500.0 },
    { name: 'Chemical Peel', category: 'Procedure', basePrice: 2500.0 },
    { name: 'Laser Hair Reduction (per session)', category: 'Laser', basePrice: 3000.0 },
    { name: 'PRP Therapy (per session)', category: 'Procedure', basePrice: 5000.0 },
    { name: 'Facial', category: 'Aesthetic', basePrice: 1500.0 },
    { name: 'Hair Treatment', category: 'Therapy', basePrice: 2000.0 },
  ];

  for (const s of servicesData) {
    const service = await prisma.service.upsert({
      where: { name: s.name },
      update: { category: s.category, basePrice: s.basePrice },
      create: {
        name: s.name,
        category: s.category,
        basePrice: s.basePrice,
        taxRate: 0.0,
      },
    });

    const existingPrice = await prisma.servicePrice.findFirst({
      where: { serviceId: service.id, isCurrent: true },
    });
    if (!existingPrice) {
      await prisma.servicePrice.create({
        data: {
          serviceId: service.id,
          price: s.basePrice,
          isCurrent: true,
        },
      });
    }
  }

  // 7. Seed Sample Medicine Categories & Medicines
  console.log('Seeding medicine categories & dermatology formulary...');
  const categories = ['Topical Creams & Ointments', 'Oral Antibiotics', 'Antifungals', 'Hair Growth Serums', 'Sun Protection'];
  const catMap = new Map<string, string>();
  for (const name of categories) {
    const cat = await prisma.medicineCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    catMap.set(name, cat.id);
  }

  const sampleMedicines = [
    {
      name: 'Tretinoin 0.05% Gel',
      brand: 'Retino-A',
      genericName: 'Tretinoin',
      category: 'Topical Creams & Ointments',
      unit: 'Tube',
      unitPrice: 280.0,
      mrp: 320.0,
    },
    {
      name: 'Adapalene + Benzoyl Peroxide Gel',
      brand: 'Epiduo',
      genericName: 'Adapalene 0.1% + Benzoyl Peroxide 2.5%',
      category: 'Topical Creams & Ointments',
      unit: 'Tube',
      unitPrice: 380.0,
      mrp: 420.0,
    },
    {
      name: 'Doxycycline 100mg Capsule',
      brand: 'Doxicip',
      genericName: 'Doxycycline Hyclate',
      category: 'Oral Antibiotics',
      unit: 'Capsule',
      unitPrice: 12.0,
      mrp: 15.0,
    },
    {
      name: 'Itraconazole 100mg Capsule',
      brand: 'Canditral',
      genericName: 'Itraconazole',
      category: 'Antifungals',
      unit: 'Capsule',
      unitPrice: 28.0,
      mrp: 35.0,
    },
    {
      name: 'Minoxidil 5% Topical Solution',
      brand: 'Mintop 5%',
      genericName: 'Minoxidil 5% w/v',
      category: 'Hair Growth Serums',
      unit: 'Bottle',
      unitPrice: 650.0,
      mrp: 750.0,
    },
    {
      name: 'Broad Spectrum Matte Sunscreen Gel SPF 50+',
      brand: 'Suncros Matte Finish',
      genericName: 'Octinoxate, Zinc Oxide, Avobenzone',
      category: 'Sun Protection',
      unit: 'Tube',
      unitPrice: 480.0,
      mrp: 550.0,
    },
    {
      name: 'Clobetasol Propionate 0.05% Ointment',
      brand: 'Tenovate',
      genericName: 'Clobetasol Propionate',
      category: 'Topical Creams & Ointments',
      unit: 'Tube',
      unitPrice: 110.0,
      mrp: 130.0,
    },
  ];

  for (const med of sampleMedicines) {
    const existing = await prisma.medicine.findFirst({ where: { name: med.name } });
    if (!existing) {
      await prisma.medicine.create({
        data: {
          name: med.name,
          brand: med.brand,
          genericName: med.genericName,
          categoryId: catMap.get(med.category),
          unit: med.unit,
          unitPrice: med.unitPrice,
          mrp: med.mrp,
          minimumStock: 10,
          gstRate: 0.0,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Database seeding completed successfully!');
  console.log('Default credentials for all seeded users: Password is "Clinic@12345"');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
