import { object, string } from "yup";

export const toggleChecklistVisibilitySchema = object({
  intent: string().oneOf(["toggle_checklist_visibility"]).required(),
  tableId: string().required(),
});
