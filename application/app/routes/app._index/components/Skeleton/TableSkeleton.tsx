import {
  BlockStack,
  Card,
  Divider,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris';

// TODO: research on skeleton loading after finishing MVP
const TableSkeleton = () => {
  return (
    <BlockStack gap={'200'}>
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={1} />
          <SkeletonBodyText lines={1} />
          <Divider />

          <Card background="bg-surface-secondary">
            <SkeletonBodyText lines={3} />
          </Card>
          <SkeletonBodyText lines={1} />
          <SkeletonBodyText lines={3} />
        </BlockStack>
      </Card>
      <Card>
        <BlockStack gap="300">
          <SkeletonDisplayText size="small" />
          <SkeletonBodyText lines={1} />
          <SkeletonBodyText lines={1} />
          <Divider />

          <Card background="bg-surface-secondary">
            <SkeletonBodyText lines={3} />
          </Card>
          <SkeletonBodyText lines={3} />
        </BlockStack>
      </Card>
    </BlockStack>
  );
};

export default TableSkeleton;
