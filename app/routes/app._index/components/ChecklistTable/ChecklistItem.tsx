import { BlockStack, Icon, Text, Box, Button } from "@shopify/polaris";
import styles from "./styles.module.css";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { type FC } from "react";
import { IncompleteCircle } from "~/assets";
import type { toggleActiveChecklistItemProps } from ".";
import type { TransformedChecklistItemData } from "../../types";

type Props = {
  task: TransformedChecklistItemData;
  tableIndex: number;
  checklistIndex: number;
  toggleActiveChecklistItem: toggleActiveChecklistItemProps;
};

export const CheckListItem: FC<Props> = (props) => {
  const { task, toggleActiveChecklistItem, checklistIndex, tableIndex } = props;
  const { header, subheader, isCompleted, isActive } = task;
  const { content, action } = task.button || {};

  return (
    <div
      role="group"
      className={` ${styles["checklist-item"]} ${isActive ? `${styles["focused"]}` : `${styles["unfocused"]}`} `}
      onClick={() => {
        if (!isActive) {
          toggleActiveChecklistItem(checklistIndex, tableIndex);
        }
      }}
    >
      <Box paddingBlock={"200"} paddingInline={"100"}>
        <BlockStack gap={"200"}>
          <div className={styles["icon-grid"]}>
            <div className={styles.checkmark}>
              {isCompleted ? (
                <Icon source={CheckCircleIcon} />
              ) : (
                <img
                  src={IncompleteCircle}
                  alt="Incomplete circle icon"
                  className={styles.icon}
                />
              )}
            </div>
            <BlockStack gap={"100"}>
              {isActive ? (
                <Text as="h3" variant="headingMd" fontWeight="semibold">
                  {header}
                </Text>
              ) : (
                <Text as="h3" variant="headingMd" fontWeight="regular">
                  {header}
                </Text>
              )}

              {isActive && (
                <>
                  {subheader && <Text as="p">{subheader}</Text>}
                  {content && action && (
                    <Box>
                      <Button variant="primary" onClick={action}>
                        {content}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </BlockStack>
          </div>
        </BlockStack>
      </Box>
    </div>
  );
};
