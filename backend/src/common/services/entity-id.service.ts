import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type EntityPrefix = 'P' | 'A' | 'RX' | 'INV';

@Injectable()
export class EntityIdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a simple, sequential, backend-only entity code:
   * Patients: P-1001
   * Appointments: A-2044
   * Prescriptions: RX-3007
   * Invoices: INV-5021
   */
  async generateNextId(prefix: EntityPrefix): Promise<string> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert sequence row and increment atomically
      const defaultStart = prefix === 'P' ? 1000 : prefix === 'A' ? 2000 : prefix === 'RX' ? 3000 : 5000;

      const seq = await tx.entitySequence.upsert({
        where: { prefix },
        update: {
          lastNumber: { increment: 1 },
        },
        create: {
          prefix,
          lastNumber: defaultStart + 1,
        },
      });

      return `${prefix}-${seq.lastNumber}`;
    });

    return result;
  }
}
