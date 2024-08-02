import {
  BlockStack,
  Card,
  InlineStack,
  Text,
  Button,
  ProgressBar,
  Divider,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon } from "@shopify/polaris-icons";
import styles from "./styles.module.css";
import type { FormEvent, FC } from "react";
import { CheckListItem } from "./ChecklistItem";
import { useFetcher } from "@remix-run/react";
import { INTENTS, FETCHER_KEYS } from "../../constants";
import type { TransformedChecklistTableData } from "~/models/types";

export type toggleActiveChecklistItemProps = (
  checklistItemIndex: number,
  tableIndex: number,
) => void;

type Props = {
  table: TransformedChecklistTableData;
  tableIndex: number;
  toggleActiveChecklistItem: toggleActiveChecklistItemProps;
};

const ChecklistTable: FC<Props> = (props) => {
  const fetcher = useFetcher({ key: FETCHER_KEYS.TOGGLE_CHECKLIST_VISIBILITY });
  const { table, tableIndex, toggleActiveChecklistItem } = props;
  const { id, header, subheader, checklistItems, isHidden } = table;

  const numTasks = checklistItems.length;
  const numTasksCompleted = checklistItems.filter(
    (task) => task.isCompleted === true,
  ).length;
  const progress = (numTasksCompleted / numTasks) * 100;

  const handleSubmitToggleVisibility = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (fetcher.state !== "idle") {
      return;
    }
    let formData = new FormData(event.currentTarget);
    // TODO: add yup validation to this
    fetcher.submit(formData, { method: "patch" });
  };

  return (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd" fontWeight="semibold">
              {header}
            </Text>
            <fetcher.Form
              method="patch"
              onSubmit={handleSubmitToggleVisibility}
            >
              <input
                type="hidden"
                name="intent"
                value={INTENTS.TOGGLE_CHECKLIST_VISIBILITY}
              />
              <input type="hidden" name="tableId" value={id} />
              <Button
                icon={isHidden ? ChevronDownIcon : ChevronUpIcon}
                accessibilityLabel="toggle-checklist-table-visibility"
                variant="tertiary"
                submit={true}
              />
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
        {!isHidden && (
          <>
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
          </>
        )}
      </BlockStack>
    </Card>
  );
};

export default ChecklistTable;
