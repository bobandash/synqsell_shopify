import { CHECKLIST_ITEM_KEYS } from "~/constants";
import { type TransformedChecklistTableData } from "~/models/types";
// gets the relevant checklist status id from key
function getChecklistItemId(
  key: string,
  tables: TransformedChecklistTableData[],
) {
  let isValidKey = false;
  let id = null;
  for (const [, value] of Object.entries(CHECKLIST_ITEM_KEYS)) {
    if (value === key) {
      isValidKey = true;
    }
  }

  if (!isValidKey) {
    return null;
  }

  tables.forEach((table) => {
    let checklistItem = table.checklistItems.find((item) => item.key === key);
    if (checklistItem) {
      id = checklistItem.id;
    }
  });

  return id;
}

export default getChecklistItemId;
