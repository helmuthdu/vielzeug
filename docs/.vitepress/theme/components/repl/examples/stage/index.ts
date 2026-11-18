import { stageExportExample } from './stage-export';
import { stageLayersExample } from './stage-layers';

const browserOnly = true;

export const stageExamples = {
  'stage-export': { ...stageExportExample, browserOnly },
  'stage-layers': { ...stageLayersExample, browserOnly },
};
