import { createContainer, token } from '@vielzeug/conduit';
import { courier } from './api';
import { logger } from './logger';
import type { Opportunity } from './types';

export interface SalesReport {
  openValue: number;
  wonValue: number;
}
export interface ReportService {
  summarize(opportunities: Opportunity[]): SalesReport;
}
const CourierToken = token<typeof courier>('Courier');
const LoggerToken = token<typeof logger>('Logger');
const ReportToken = token<ReportService>('ReportService');
const container = createContainer({ name: 'vielzeug-crm' });
container.value(CourierToken, courier);
container.value(LoggerToken, logger);
container.factory(ReportToken, [CourierToken, LoggerToken] as const, (api, log) => ({
  summarize(opportunities) {
    log.debug(`Summarizing ${opportunities.length} opportunities; courier disposed: ${api.disposed}`);
    return {
      openValue: opportunities
        .filter((item) => !item.stage.startsWith('closed'))
        .reduce((sum, item) => sum + Number(item.amount), 0),
      wonValue: opportunities
        .filter((item) => item.stage === 'closed-won')
        .reduce((sum, item) => sum + Number(item.amount), 0),
    };
  },
}));
export function getReportService(): Promise<ReportService> {
  return container.resolve(ReportToken);
}
