import db from '~/db.server';
import {
  sampleChecklistItemOne,
  sampleChecklistItemTwo,
  sampleChecklistTable,
  sampleUserPreference,
} from '../fixtures/checklist.fixture';
import { createSampleSession } from './session.factories';

export const createSampleChecklistTable = async (overrides = {}) => {
  await createSampleSession();
  await db.checklistTable.create({
    data: {
      ...sampleChecklistTable,
      ...overrides,
    },
  });

  await db.checklistItem.create({ data: sampleChecklistItemOne });
  await db.checklistItem.create({ data: sampleChecklistItemTwo });

  await db.userPreference.create({
    data: sampleUserPreference,
  });
};
