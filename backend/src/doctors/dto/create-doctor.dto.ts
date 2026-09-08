import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsEmail } from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 'usr-uuid-here', description: 'User ID associated with the doctor (optional if creating user inline)', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Dr. Rahul', description: 'First Name (required if userId not provided)', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Sharma', description: 'Last Name (required if userId not provided)', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'dr.rahul@ewaderma.com', description: 'Doctor Email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+91 98765 43210', description: 'Doctor Contact Phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Doctor@123', description: 'Initial login password', required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'Dermatologist', description: 'Medical Specialization' })
  @IsNotEmpty()
  @IsString()
  specialization: string;

  @ApiProperty({ example: 'MBBS, MD (Dermatology)', required: false })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiProperty({ example: 'UPMC-78452', required: false, description: 'Medical registration number' })
  @IsOptional()
  @IsString()
  regNumber?: string;

  @ApiProperty({ example: 500, description: 'Consultation fee in INR', default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @ApiProperty({ example: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', description: 'Working days of the week' })
  @IsOptional()
  @IsString()
  workingDays?: string;

  @ApiProperty({ example: '10:00-19:00', description: 'Operating working hours' })
  @IsOptional()
  @IsString()
  workingHours?: string;
}

