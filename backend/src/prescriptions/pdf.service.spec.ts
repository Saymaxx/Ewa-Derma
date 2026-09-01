import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate valid PDF bytes starting with %PDF-', async () => {
    const sampleData = {
      clinicName: 'Ewa Derma Clinic',
      clinicAddress: 'Golf City, Sector B, Ansal API, Lucknow, UP 226030',
      clinicPhone: '0120-5244840',
      prescriptionCode: 'RX-3001',
      version: 1,
      date: '01 Sept 2026',
      doctorName: 'Dr. A Sharma',
      doctorSpecialization: 'Dermatologist',
      doctorRegNumber: 'UPMC-78452',
      patientName: 'Aarav Gupta',
      patientCode: 'P-1001',
      patientAgeGender: 'Male',
      patientPhone: '9876543210',
      diagnoses: ['Acne Vulgaris (Moderate)'],
      items: [
        {
          medicineName: 'Tretinoin 0.05% Gel',
          dosage: '0.05%',
          frequency: '0-0-1 (Night)',
          duration: '30 days',
          route: 'Topical',
          instructions: 'Apply thin layer',
        },
      ],
      generalAdvice: 'Drink plenty of water and avoid direct UV exposure',
      followUpDate: '15 Sept 2026',
    };

    const pdfBuffer = await service.generatePrescriptionPdf(sampleData);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(100);

    // Verify PDF header magic bytes: %PDF- (ASCII: 37, 80, 68, 70, 45)
    const header = String.fromCharCode(...pdfBuffer.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
