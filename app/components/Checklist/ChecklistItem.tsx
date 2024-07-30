import { BlockStack, Icon, Text, Box, Button } from "@shopify/polaris";
import styles from "./styles.module.css";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { type FC } from "react";
import { type Task } from ".";
import { IncompleteCircle } from "~/assets";
type ContainerProps = {
  isActive: boolean;
  children: React.ReactNode;
};

type ChecklistItemProps = {
  task: Task;
};

const Container: FC<ContainerProps> = ({ isActive, children }) => {
  if (isActive) {
    return (
      <div
        role="group"
        className={`${styles["focused"]} ${styles["checklist-item"]}`}
      >
        <Box paddingBlock={"200"} paddingInline={"100"}>
          {children}
        </Box>
      </div>
    );
  }

  return (
    <div
      role="group"
      className={`${styles["unfocused"]} ${styles["checklist-item"]}`}
    >
      <Box paddingBlock={"100"} paddingInline={"100"}>
        {children}
      </Box>
    </div>
  );
};

export const CheckListItem: FC<ChecklistItemProps> = (props) => {
  const { task } = props;
  const { header, subheader, isItemCompleted, isActive } = task;

  return (
    <Container isActive={isActive}>
      <BlockStack gap={"200"}>
        <div className={styles["icon-grid"]}>
          <div className={styles.checkmark}>
            {isItemCompleted ? (
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
                <Box>
                  <Button variant="primary">Get Access</Button>
                </Box>
              </>
            )}
          </BlockStack>
        </div>
      </BlockStack>
    </Container>
  );
};
