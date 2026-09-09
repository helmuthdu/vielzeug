import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit';
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
const reportProvider = factoryProvider(ReportToken, [CourierToken, LoggerToken], (api, log) => ({
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
const container = createContainer(
  [valueProvider(CourierToken, courier), valueProvider(LoggerToken, logger), reportProvider],
  { name: 'vielzeug-crm' },
);

export function getReportService(): Promise<ReportService> {
  return container.resolve(ReportToken);
}
