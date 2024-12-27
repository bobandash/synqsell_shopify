import {
  BlockStack,
  Card,
  InlineStack,
  Text,
  ProgressBar,
  Divider,
} from '@shopify/polaris';
import styles from './styles.module.css';
import type { FC } from 'react';
import { CheckListItem } from './ChecklistItem';
import type { TransformedChecklistTableData } from '../../types';

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
  const { table, tableIndex, toggleActiveChecklistItem } = props;
  const { header, subheader, checklistItems, isHidden } = table;
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
          </InlineStack>
          <Text as="p" variant="bodyMd">
            {subheader}
          </Text>
          <InlineStack gap={'200'}>
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
