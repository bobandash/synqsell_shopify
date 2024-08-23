export type ChecklistTableData = {
  id: string;
  position: number;
  header: string;
  subheader: string | null;
  checklistItems: ChecklistItemData[];
};

export type ChecklistItemData = {
  header: string;
  subheader?: string | null;
  isCompleted: boolean;
  isActive: boolean;
  id: string;
  key: string;
  checklistTableId: string;
  position: number;
  buttonText: String;
};

export type ChecklistStatusData = {
  id: string;
  sessionId: string;
  checklistItemId: string;
  isCompleted: string;
};

export type TransformedChecklistTableData = {
  id: string;
  position: number;
  header: string;
  subheader: string | null;
  isHidden: boolean;
  checklistItems: TransformedChecklistItemData[];
};

export type LoaderResponse = {
  tables: TransformedChecklistTableData[];
};

type BtnAction = null | (() => void);
export type TransformedChecklistItemData = {
  id: string;
  key: string;
  checklistTableId: string;
  position: number;
  header: string;
  subheader: string | null;
  isCompleted: boolean;
  button?: { content: string; action: BtnAction };
  isActive: boolean;
};
