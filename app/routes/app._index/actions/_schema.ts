import { object, string } from "yup";
import { INTENTS } from "../constants";
import { hasChecklistItem } from "~/models/checklistItem";
import { hasChecklistTable } from "~/models/checklistTable";

export const toggleChecklistVisibilitySchema = object({
  intent: string().oneOf([INTENTS.TOGGLE_CHECKLIST_VISIBILITY]).required(),
  tableId: string()
    .required()
    .test("check-item-id", "Invalid checklist table ID", hasChecklistTable),
});

export const getStartedRetailerSchema = object({
  intent: string().oneOf([INTENTS.RETAILER_GET_STARTED]),
  checklistItemId: string()
    .required()
    .test("check-item-id", "Invalid checklist item ID", hasChecklistItem),
});

export const getStartedSupplierSchema = object({
  intent: string().oneOf([INTENTS.SUPPLIER_GET_STARTED]),
  checklistItemId: string()
    .required()
    .test("check-item-id", "Invalid checklist item ID", hasChecklistItem),
});
