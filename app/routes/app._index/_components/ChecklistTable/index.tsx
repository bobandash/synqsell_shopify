import {
  BlockStack,
  Card,
  InlineStack,
  Text,
  Button,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { ChevronUpIcon } from "@shopify/polaris-icons";
import styles from "./styles.module.css";
import { type FC } from "react";
import { CheckListItem } from "./ChecklistItem";
import { useFetcher } from "@remix-run/react";

export type ChecklistTableProps = {
  id: string;
  position: number;
  header: string;
  subheader: string;
  isHidden: boolean;
  checklistItems: ChecklistItemProps[];
};

export type ChecklistItemProps = {
  header: string;
  subheader: string | null;
  isCompleted: boolean;
  isActive: boolean;
  id: string;
  key: string;
  checklistTableId: string;
  position: number;
  button?: {
    content: string;
    action: null;
  };
};

export type toggleActiveChecklistItemProps = (
  checklistItemIndex: number,
  tableIndex: number,
) => void;

type Props = {
  checklist: ChecklistTableProps;
  tableIndex: number;
  toggleActiveChecklistItem: toggleActiveChecklistItemProps;
};

const ChecklistTable: FC<Props> = (props) => {
  const {
    checklist: { header, subheader, checklistItems },
    tableIndex,
    toggleActiveChecklistItem,
  } = props;
  const fetcher = useFetcher();
  const numTasks = checklistItems.length;
  const numTasksCompleted = checklistItems.filter(
    (task) => task.isCompleted === true,
  ).length;
  const progress = (numTasksCompleted / numTasks) * 100;

  return (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd" fontWeight="semibold">
              {header}
            </Text>
            <fetcher.Form method="patch">
              <input
                type="hidden"
                name="intent"
                value="toggle_checklist_visibility"
              />

              <Button
                icon={ChevronUpIcon}
                accessibilityLabel="toggle-checklist-table-visibility"
                variant="tertiary"
              ></Button>
            </fetcher.Form>
          </InlineStack>
          <Text as="p" variant="bodyMd">
            {subheader}
          </Text>
          <InlineStack gap={"200"}>
            <Text as="p" variant="bodyMd">
              {`${numTasksCompleted} of ${numTasks} tasks complete`}
            </Text>
            <div className={styles.centered}>
              <ProgressBar size="small" progress={progress} tone="primary" />
            </div>
          </InlineStack>
        </BlockStack>
        <Divider />
        <BlockStack gap="100">
          {checklistItems.map((item, index) => (
            <CheckListItem
              key={item.id}
              task={item}
              tableIndex={tableIndex}
              checklistIndex={index}
              toggleActiveChecklistItem={toggleActiveChecklistItem}
            />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
};

export default ChecklistTable;
