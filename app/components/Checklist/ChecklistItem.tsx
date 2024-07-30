import { BlockStack, Icon, Text, Box, Button } from "@shopify/polaris";
import styles from "./styles.module.css";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { type FC } from "react";
import { type Task } from ".";
import { IncompleteCircle } from "~/assets";

type Props = {
  task: Task;
};

export const CheckListItem: FC<Props> = (props) => {
  const { task } = props;
  const { header, subheader, isItemCompleted, isActive } = task;

  return (
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
          <Text as="h3" variant="headingMd" fontWeight="semibold">
            {header}
          </Text>
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
  );
};
