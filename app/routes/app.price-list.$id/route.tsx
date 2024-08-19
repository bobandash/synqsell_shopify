import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  useLocation,
  useSubmit as useRemixSubmit,
} from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  Form,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
  Thumbnail,
} from "@shopify/polaris";
import { asChoiceList, notEmpty, useField, useForm } from "@shopify/react-form";
import { StatusCodes } from "http-status-codes";
import { redirect } from "remix-typedjson";
import {
  PRICE_LIST_CATEGORY,
  PRICE_LIST_IMPORT_SETTINGS,
  PRICE_LIST_PRICING_STRATEGY,
} from "~/constants";
import {
  createPriceListAndCompleteChecklistItem,
  getPriceListDetailedInfo,
  userHasPriceList,
  type CreatePriceListDataProps,
} from "~/models/priceList";
import styles from "~/shared.module.css";
import { authenticate } from "~/shopify.server";
import { convertFormDataToObject, getJSONError } from "~/util";
import {
  categoryChoices,
  formatPriceListData,
  generalPriceListImportSettingChoices,
  pricingStrategyChoices,
} from "~/formData/pricelist";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ProductFilterControl } from "~/components";
import { useCallback, useState } from "react";
import { ImageIcon, XIcon } from "@shopify/polaris-icons";

// !!! TODO: add products to the type for this
type LoaderDataProps = {
  id: string;
  createdAt: string;
  name: string;
  isGeneral: boolean;
  requiresApprovalToImport: boolean;
  pricingStrategy: string;
  supplierId: string;
  margin: number;
};

type SelectedProductProps = {
  id: string;
  title: string;
  images: {
    id: string;
    altText?: string;
    originalSrc: string;
  }[];
  status: string;
  totalInventory: number;
  storeUrl: string | null;
  variants: {
    title: string;
    sku: string;
    inventoryQuantity: number;
    price: string;
  }[];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const formData = await request.formData();
    const data = convertFormDataToObject(formData) as CreatePriceListDataProps;
    const newPriceList = await createPriceListAndCompleteChecklistItem(
      data,
      sessionId,
    );
    return redirect(`/app/price-list/${newPriceList.id}`);
  } catch (error) {
    throw getJSONError(error, "settings");
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const { id: priceListId } = params;

    if (!priceListId) {
      throw json("Price list id is empty", {
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const hasPriceList = await userHasPriceList(sessionId, priceListId);
    if (!hasPriceList) {
      throw json("User does not have price list.", {
        status: StatusCodes.UNAUTHORIZED,
      });
    }

    const visibleProfiles = await getPriceListDetailedInfo(
      sessionId,
      priceListId,
    );
    return json(visibleProfiles);
  } catch (error) {
    throw getJSONError(error, "retailer network");
  }
};

const EditPriceList = () => {
  const initialData = useLoaderData<typeof loader>() as LoaderDataProps;
  const { pathname } = useLocation();
  const backActionUrl = pathname.substring(0, pathname.lastIndexOf("/"));
  const shopify = useAppBridge();
  const remixSubmit = useRemixSubmit();
  const [selectedProducts, setSelectedProducts] = useState<
    SelectedProductProps[]
  >([]);

  const { fields, submit } = useForm({
    fields: {
      name: useField({
        value: initialData.name,
        validates: [notEmpty("Price list name is required")],
      }),
      category: useField(
        initialData.isGeneral
          ? PRICE_LIST_CATEGORY.GENERAL
          : PRICE_LIST_CATEGORY.PRIVATE,
      ),
      generalPriceListImportSettings: useField(
        initialData.requiresApprovalToImport
          ? PRICE_LIST_IMPORT_SETTINGS.APPROVAL
          : PRICE_LIST_IMPORT_SETTINGS.NO_APPROVAL,
      ),
      pricingStrategy: useField(initialData.pricingStrategy),
      margin: useField({
        value: initialData.margin.toString() ?? "10",
        validates: (value) => {
          const valueFloat = parseFloat(value);
          if (!value) {
            return "Margin cannot be empty.";
          } else if (valueFloat < 0) {
            return "Margin cannot be less than 0.";
          } else if (
            fields.category.value === PRICE_LIST_CATEGORY.GENERAL &&
            valueFloat < 10
          ) {
            return "Retailer must have at least 10% margin for general price list";
          }
        },
      }),
    },
    onSubmit: async (fieldValues) => {
      const formattedData = formatPriceListData(fieldValues);
      remixSubmit(formattedData, {
        method: "post",
        action: pathname,
      });
      return { status: "success" };
    },
  });

  // !!! TODO: add frontend error handling
  async function getIdToStoreUrl(productIds: string[]) {
    const params = {
      productIds,
    };
    const encodedParams = encodeURIComponent(JSON.stringify(params));
    const response = await fetch(
      `/app/api/price-list?params=${encodedParams}`,
      {
        method: "GET",
      },
    );
    const data = await response.json();
    return data;
  }

  const removeSelectedProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => prev.filter(({ id }) => id !== productId));
  }, []);

  async function handleSelectProducts() {
    const products = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      showArchived: false,
      showDraft: false,
      filter: {
        variants: false,
      },
    });
    if (products) {
      const productIds = products.map(({ id }) => id);
      const idToStoreUrl = await getIdToStoreUrl(productIds);

      const productsFormatted: SelectedProductProps[] = products.map(
        ({
          id,
          title,
          images,
          status,
          totalInventory,
          variants,
          totalVariants,
        }) => {
          return {
            id,
            title,
            images,
            status,
            storeUrl: idToStoreUrl[id] ?? "",
            totalInventory,
            totalVariants,
            variants: variants.map(
              ({ title, sku, inventoryQuantity, price }) => ({
                title: title ?? "",
                sku: sku ?? "",
                inventoryQuantity: inventoryQuantity ?? 0,
                price: price ?? "",
              }),
            ),
          };
        },
      );

      setSelectedProducts((prev) => {
        const newSelectedProductIds = new Set(
          productsFormatted.map((product) => product.id),
        );
        const nonDuplicateProducts = prev.filter(
          (product) => !newSelectedProductIds.has(product.id),
        );
        return [...nonDuplicateProducts, ...productsFormatted];
      });
    }
  }

  return (
    <Form onSubmit={submit}>
      <Page
        title="Edit Price List"
        backAction={{ content: "Price Lists", url: backActionUrl }}
      >
        <Box paddingBlockEnd={"400"}>
          <Layout>
            <Layout.Section variant="oneThird">
              <BlockStack gap={"300"}>
                <Card>
                  <TextField label="Name" autoComplete="off" {...fields.name} />
                </Card>
              </BlockStack>
            </Layout.Section>
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <FormLayout>
                    <Box>
                      <Text as="h2" variant="headingMd">
                        Category
                      </Text>
                      <ChoiceList
                        {...asChoiceList(fields.category)}
                        title="Category"
                        choices={categoryChoices}
                        titleHidden
                      />
                    </Box>
                    {fields.category.value === PRICE_LIST_CATEGORY.GENERAL && (
                      <ChoiceList
                        {...asChoiceList(fields.generalPriceListImportSettings)}
                        title="Product Import Settings"
                        choices={generalPriceListImportSettingChoices}
                      />
                    )}
                  </FormLayout>
                </Card>
                <Card>
                  <FormLayout>
                    <Box>
                      <Text as="h2" variant="headingMd">
                        Pricing Strategy
                      </Text>
                      <ChoiceList
                        {...asChoiceList(fields.pricingStrategy)}
                        title="Pricing Strategy"
                        titleHidden
                        choices={pricingStrategyChoices}
                      />
                    </Box>

                    {fields.pricingStrategy.value ===
                      PRICE_LIST_PRICING_STRATEGY.MARGIN && (
                      <TextField
                        type="number"
                        label="Margin (%) that Retailer Generates on Sale"
                        autoComplete="off"
                        {...fields.margin}
                      />
                    )}
                  </FormLayout>
                </Card>
                <Card>
                  <Text as="h2" variant="headingMd">
                    Retailers Connected
                  </Text>
                </Card>
                <Card padding={"200"}>
                  <Box paddingInline={"200"} paddingBlockStart={"100"}>
                    <Text as="h2" variant="headingMd">
                      Products
                    </Text>
                  </Box>
                  <ResourceList
                    resourceName={{ singular: "product", plural: "products" }}
                    flushFilters={true}
                    filterControl={
                      <ProductFilterControl
                        onQueryFocus={handleSelectProducts}
                      />
                    }
                    emptyState={<></>}
                    items={selectedProducts}
                    renderItem={(selectedProduct) => (
                      <ProductLineItem
                        selectedProduct={selectedProduct}
                        removeSelectedProduct={removeSelectedProduct}
                      />
                    )}
                  />
                  <Box paddingBlockEnd={"100"}></Box>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </Box>
        <div className={styles["center-right"]}>
          <Button submit variant="primary">
            Save
          </Button>
        </div>
      </Page>
    </Form>
  );
};

// !!! TODO: figure out how to tell the currency
const ProductLineItem = ({
  selectedProduct,
  removeSelectedProduct,
}: {
  selectedProduct: SelectedProductProps;
  removeSelectedProduct: (productId: string) => void;
}) => {
  const { id, title, storeUrl, images, variants } = selectedProduct;
  const primaryImage = images[0] ? images[0].originalSrc : ImageIcon;
  const primaryImageAlt =
    images[0] && images[0].altText ? images[0].altText : `${title} image`;
  const retailPrices = variants.map(({ price }) => `$${price}`);
  return (
    <ResourceItem
      id={id}
      url={storeUrl ?? ""}
      media={
        <Thumbnail source={primaryImage} alt={primaryImageAlt} size="large" />
      }
    >
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack>
          <Text as="p" variant="headingSm">
            {title}
          </Text>
          <Text as="p" variant="bodyMd">
            Price(s): {retailPrices.join(",")}
          </Text>
          <Text as="p" variant="bodyMd">
            Amount To Pay Retailer: {retailPrices.join(",")}
          </Text>
          <Text as="p" variant="bodyMd">
            Profit / Wholesale Price: {retailPrices.join(",")}
          </Text>
        </BlockStack>
        <Button
          icon={XIcon}
          accessibilityLabel="Remove Item"
          onClick={() => {
            removeSelectedProduct(id);
          }}
        />
      </InlineStack>
    </ResourceItem>
  );
};

export default EditPriceList;
