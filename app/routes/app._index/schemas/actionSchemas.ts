import { object, string } from "yup";
import { INTENTS } from "../constants";

export const toggleChecklistVisibilitySchema = object({
  intent: string().oneOf([INTENTS.TOGGLE_CHECKLIST_VISIBILITY]).required(),
  tableId: string().required(),
});

export const getStartedRetailerSchema = object({
  intent: string().oneOf([INTENTS.RETAILER_GET_STARTED]),
});
