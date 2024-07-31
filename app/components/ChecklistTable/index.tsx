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

type Props = {
  checklist: ChecklistTableProps;
};

const ChecklistTable: FC<Props> = (props) => {
  const {
    checklist: { header, subheader, checklistItems },
  } = props;
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
            <Button
              icon={ChevronUpIcon}
              accessibilityLabel="Hide CheckList"
              variant="tertiary"
            ></Button>
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
          {checklistItems.map((item) => (
            <CheckListItem key={item.id} task={item} />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
};

export default ChecklistTable;
