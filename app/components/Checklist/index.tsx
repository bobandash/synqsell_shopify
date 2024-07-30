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

// shared types
export type ChecklistProps = {
  header: string;
  subheader?: string;
  tasks: Task[];
};

export type Task = {
  id: number;
  header: string;
  subheader?: string;
  isItemCompleted: boolean;
  isActive: boolean;
  button?: ButtonProps;
};

export type ButtonProps = {
  content: string;
  action: () => void;
};

type Props = {
  checklist: ChecklistProps;
};

const Checklist: FC<Props> = (props) => {
  const {
    checklist: { header, subheader, tasks },
  } = props;
  const numTasks = tasks.length;
  const numTasksCompleted = tasks.filter(
    (task) => task.isItemCompleted === true,
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
          {tasks.map((task) => (
            <CheckListItem key={task.id} task={task} />
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
};

export default Checklist;
