import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_GOALS = {
  dailySales: 200000,
  monthlySales: 5000000,
  dailyOrders: 10,
  monthlyOrders: 200,
  targetMargin: 35,
  avgTicket: 25000,
};

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async getGoals() {
    const row = await this.prisma.config.findUnique({ where: { key: 'sales_goals' } });
    if (!row) return { ...DEFAULT_GOALS };
    try {
      return { ...DEFAULT_GOALS, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_GOALS };
    }
  }

  async setGoals(goals: any) {
    const clean = { ...DEFAULT_GOALS };
    for (const key of Object.keys(DEFAULT_GOALS)) {
      const num = Number(goals?.[key]);
      if (!Number.isNaN(num) && num >= 0) clean[key] = Math.round(num);
    }
    await this.prisma.config.upsert({
      where: { key: 'sales_goals' },
      update: { value: JSON.stringify(clean) },
      create: { key: 'sales_goals', value: JSON.stringify(clean) },
    });
    return clean;
  }
}
