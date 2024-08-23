import { BlockStack, Card, SkeletonBodyText } from "@shopify/polaris";

const TableSkeleton = () => {
  return (
    <BlockStack gap={"200"}>
      <Card>
        <SkeletonBodyText lines={10} />;
      </Card>
      <Card>
        <SkeletonBodyText lines={10} />;
      </Card>
    </BlockStack>
  );
};

export default TableSkeleton;
