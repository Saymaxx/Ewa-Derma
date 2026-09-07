import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePatientDto } from './create-patient.dto';
import { Gender, BloodGroup } from '@prisma/client';

describe('CreatePatientDto Validation', () => {
  const transformAndValidate = async (plain: Record<string, any>) => {
    const instance = plainToInstance(CreatePatientDto, plain);
    const errors = await validate(instance);
    return { instance, errors };
  };

  it('should pass validation with valid required fields and empty optional strings', async () => {
    const rawData = {
      firstName: '  Rahul  ',
      lastName: '  Sharma  ',
      phone: '  9876543210  ',
      email: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      address: '',
      city: '',
      state: '',
      emergencyContact: '',
      medicalHistory: '',
      allergies: '',
    };

    const { instance, errors } = await transformAndValidate(rawData);

    expect(errors).toHaveLength(0);
    expect(instance.firstName).toBe('Rahul');
    expect(instance.lastName).toBe('Sharma');
    expect(instance.phone).toBe('9876543210');
    expect(instance.email).toBeUndefined();
    expect(instance.dateOfBirth).toBeUndefined();
    expect(instance.gender).toBeUndefined();
    expect(instance.bloodGroup).toBeUndefined();
  });

  it('should pass validation with valid optional email, dateOfBirth and enums', async () => {
    const rawData = {
      firstName: 'Pooja',
      lastName: 'Verma',
      phone: '+91 98765 43210',
      email: 'pooja.verma@example.com',
      dateOfBirth: '1992-04-20',
      gender: Gender.FEMALE,
      bloodGroup: BloodGroup.B_POSITIVE,
      address: 'Sector 18, Lucknow',
    };

    const { instance, errors } = await transformAndValidate(rawData);

    expect(errors).toHaveLength(0);
    expect(instance.email).toBe('pooja.verma@example.com');
    expect(instance.gender).toBe(Gender.FEMALE);
    expect(instance.bloodGroup).toBe(BloodGroup.B_POSITIVE);
  });

  it('should reject invalid email format when non-empty invalid string is provided', async () => {
    const rawData = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '9876543210',
      email: 'not-a-valid-email-format',
    };

    const { errors } = await transformAndValidate(rawData);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints?.isEmail).toBe('Invalid email address format');
  });

  it('should reject invalid dateOfBirth format when non-empty invalid date is provided', async () => {
    const rawData = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '9876543210',
      dateOfBirth: '31-02-1990', // Non-ISO format
    };

    const { errors } = await transformAndValidate(rawData);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('dateOfBirth');
    expect(errors[0].constraints?.isDateString).toBe('Date of birth must be a valid ISO date');
  });

  it('should reject missing required fields', async () => {
    const rawData = {
      email: 'test@example.com',
    };

    const { errors } = await transformAndValidate(rawData);

    const errorFields = errors.map((e) => e.property);
    expect(errorFields).toContain('firstName');
    expect(errorFields).toContain('lastName');
    expect(errorFields).toContain('phone');
  });

  it('should reject malformed phone numbers', async () => {
    const rawData = {
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '123', // Too short
    };

    const { errors } = await transformAndValidate(rawData);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('phone');
    expect(errors[0].constraints?.matches).toBe('Please provide a valid phone number');
  });
});
