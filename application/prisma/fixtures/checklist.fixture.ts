import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { sampleSession } from './session.fixture';

const sampleChecklistTable = {
  id: 'checklist-table-1',
  position: 1,
  header: 'Retailer Setup Guide',
  subheader:
    'Follow the steps below to import products from suppliers on our platform.',
};

const sampleChecklistItemOne = {
  id: 'checklist-item-1',
  key: CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED,
  position: 1,
  header: 'Become a retailer',
  subheader:
    "Click get access to add SynqSell's functionality onto your store and start importing products from our supplier network.",
  buttonText: 'Get Access',
  checklistTableId: sampleChecklistTable.id,
};

const sampleChecklistItemTwo = {
  id: 'checklist-item-2',
  key: CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
  position: 2,
  header: 'Customize your brand profile',
  subheader:
    'Showcase the information you would like to display in the retailer network for suppliers to see.',
  buttonText: 'Edit Brand Profile',
  checklistTableId: sampleChecklistTable.id,
};

const sampleChecklistStatusOne = {
  id: 'checklist-status-1',
  checklistItemId: sampleChecklistItemOne.id,
  isCompleted: false,
  sessionId: sampleSession.id,
};

const sampleChecklistStatusTwo = {
  id: 'checklist-status-2',
  checklistItemId: sampleChecklistItemTwo.id,
  isCompleted: false,
  sessionId: sampleSession.id,
};

const sampleUserPreference = {
  id: 'user-preference-1',
  tableIdsHidden: [sampleChecklistTable.id],
  sessionId: sampleSession.id,
};

export {
  sampleChecklistItemOne,
  sampleChecklistItemTwo,
  sampleChecklistTable,
  sampleChecklistStatusOne,
  sampleChecklistStatusTwo,
  sampleUserPreference,
};
