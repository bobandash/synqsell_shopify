import db from '~/db.server';
import {
  sampleChecklistItemOne,
  sampleChecklistItemTwo,
  sampleChecklistTable,
} from '../fixtures/checklist.fixture';

export const createSampleChecklistTable = async (overrides = {}) => {
  await db.checklistTable.create({
    data: {
      ...sampleChecklistTable,
      ...overrides,
    },
  });
  await Promise.all([
    db.checklistItem.create({ data: sampleChecklistItemOne }),
    db.checklistItem.create({ data: sampleChecklistItemTwo }),
  ]);
};
