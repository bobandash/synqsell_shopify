import { BlockStack, Card, Layout, Text } from '@shopify/polaris';

import { useRoleContext } from '~/context/RoleProvider';

const TermsOfService = () => {
  const { isSupplier, isRetailer } = useRoleContext();

  return (
    <Layout.AnnotatedSection
      id="termsOfService"
      title="Terms of Service and Usage Policies"
      description="How Synqsell stores payment information, and details of payment flow."
    >
      <Card>
        <BlockStack gap="200">
          <BlockStack gap="050">
            <Text variant="bodyLg" as="p" fontWeight="bold">
              Data Collection:
            </Text>
            <Text variant="bodyMd" as="p">
              All data collected by our service is securely stored on Stripe, a
              leading payment processing platform known for its robust security
              measures.
            </Text>
          </BlockStack>
          {isRetailer && (
            <BlockStack gap="050">
              <Text variant="bodyLg" as="h2" fontWeight="bold">
                Retailer Policy:
              </Text>
              <Text variant="bodyMd" as="p">
                Synqsell will only charge your payment method when you import a
                product from Synqsell, a customer buys the imported product, and
                the supplier ships the product and the tracking shows delivered.
                You will be billed the aforementioned terms that you and the
                supplier agreed upon (the supplier profit).
              </Text>
            </BlockStack>
          )}
          {isSupplier && (
            <BlockStack gap="050">
              <Text variant="bodyLg" as="h2" fontWeight="bold">
                Supplier Policy:
              </Text>
              <Text variant="bodyMd" as="p">
                Synqsell currently only support automatic payments. Once the
                item is marked as delivered, you will receive the paid balance
                in your Stripe Connect account, which typically will be
                disbursed to your bank account in 3-14 business days.
              </Text>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </Layout.AnnotatedSection>
  );
};

export default TermsOfService;
