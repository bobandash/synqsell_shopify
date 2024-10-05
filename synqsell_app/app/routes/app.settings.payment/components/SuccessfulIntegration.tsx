import { BlockStack, Icon, InlineStack, Text } from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import type { FC } from 'react';

type Props = {
  text: string;
};

const SuccessfulIntegration: FC<Props> = (props) => {
  const { text } = props;
  return (
    <BlockStack gap="200">
      <InlineStack gap="100">
        <div>
          <Icon source={CheckCircleIcon} tone="base" />
        </div>
        <Text variant="headingMd" as="h2" fontWeight="bold">
          {text}
        </Text>
      </InlineStack>
    </BlockStack>
  );
};

export default SuccessfulIntegration;
