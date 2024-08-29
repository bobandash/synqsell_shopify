import { BlockStack, Card, Icon, InlineStack, Text } from "@shopify/polaris";
import styles from "../styles.module.css";
import sharedStyles from "~/shared.module.css";
import { EmailIcon, DeliveryFilledIcon } from "@shopify/polaris-icons";
import { SocialIcon } from "react-social-icons";

const RetailerCard = () => {
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="start">
          <InlineStack gap={"300"}>
            <div
              className={`${styles["black-square"]} ${styles.rounded}`}
            ></div>
            <BlockStack>
              <Text variant="headingLg" as="h2" fontWeight="bold">
                BlankMod
              </Text>
              <a
                href="https://www.blankmod.com"
                target="_blank"
                rel="noreferrer"
                className={`${styles["link"]}`}
              >
                www.blankmod.com
              </a>
              <Text variant="bodyMd" as="p">
                Los Angeles, CA, USA
              </Text>
              <InlineStack gap={"150"} align={"start"}>
                <SocialIcon
                  url="https://twitter.com"
                  target="_blank"
                  className={`${styles["logo"]}`}
                />
                <SocialIcon
                  url="https://pinterest.com"
                  target="_blank"
                  className={`${styles["logo"]}`}
                />
              </InlineStack>
            </BlockStack>
          </InlineStack>
          <InlineStack gap={"200"}>
            <a href="mailto:someone@example.com" title="someone@example.com">
              <Icon source={EmailIcon} tone="base" />
            </a>
          </InlineStack>
        </InlineStack>
        <InlineStack gap={"200"}>
          <div className={`${styles.tag}`}>
            <Text as="p" variant="bodySm">
              Plush
            </Text>
          </div>
          <div className={`${styles.tag}`}>
            <Text as="p" variant="bodySm">
              Figure
            </Text>
          </div>
          <div className={`${styles.tag}`}>
            <Text as="p" variant="bodySm">
              Keychains
            </Text>
          </div>
        </InlineStack>
        <BlockStack>
          <Text variant="headingMd" as="h3">
            About Us:
          </Text>
          <Text variant="bodyMd" as="p">
            We manufacture official merchandise from a lot of video games and tv
            shows.
          </Text>
        </BlockStack>
        <BlockStack>
          <Text variant="headingMd" as="h3">
            What We're Looking For:
          </Text>
          <Text variant="bodyMd" as="p">
            Partnerships with other brands who have video game consumers.
          </Text>
        </BlockStack>
        <InlineStack align="space-between">
          <InlineStack>
            <div className={`${styles["delivery-tag"]}`}>
              <Icon source={DeliveryFilledIcon} />
              <Text as="p" variant="bodySm" fontWeight="medium">
                5 - 14 Days
              </Text>
            </div>
          </InlineStack>
          <InlineStack gap={"200"}>
            <button
              className={`${sharedStyles["orange"]} ${sharedStyles["btn"]}`}
            >
              <Text as="p" variant="bodySm" fontWeight="medium">
                Request Price List
              </Text>
            </button>
            <button
              className={`${sharedStyles["blue"]} ${sharedStyles["btn"]}`}
            >
              <Text as="p" variant="bodySm" fontWeight="medium">
                See Products
              </Text>
            </button>
          </InlineStack>
        </InlineStack>
      </BlockStack>
    </Card>
  );
};

export default RetailerCard;
