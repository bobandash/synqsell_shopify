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
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
  type IndexTableProps,
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
import type { PriceListPricingStrategyProps } from "~/formData/pricelist";
import { useAppBridge } from "@shopify/app-bridge-react";
import { ProductFilterControl } from "~/components";
import { type FC, Fragment, useCallback, useMemo, useState } from "react";
import { ImageIcon } from "@shopify/polaris-icons";
import { round } from "../util";

// !!! TODO: add products to the type for this
type LoaderDataProps = {
  id: string;
  createdAt: string;
  name: string;
  isGeneral: boolean;
  requiresApprovalToImport: boolean;
  pricingStrategy: PriceListPricingStrategyProps;
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
  totalVariants: number;
  storeUrl: string | null;
  variants: {
    id: string;
    title: string;
    sku: string;
    inventoryQuantity: number;
    price: string;
  }[];
};

type ProductTableRowProps = {
  product: SelectedProductProps;
  margin: string;
  pricingStrategy: PriceListPricingStrategyProps;
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
  const [products, setProducts] = useState<SelectedProductProps[]>([]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  // Mandatory fields for index table
  const numRows = useMemo(() => {
    return products.reduce((acc, product) => {
      acc += product.variants.length;
      return acc;
    }, 0);
  }, [products]);

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const headings: IndexTableProps["headings"] = [
    { title: "Product" },
    { title: "Price" },
    { title: "Retailer Payment" },
    { title: "Profit / Wholesale Price" },
  ];

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
      pricingStrategy: useField<PriceListPricingStrategyProps>(
        initialData.pricingStrategy,
      ),
      margin: useField({
        value: initialData.margin.toString() ?? "10",
        validates: (value) => {
          const valueFloat = parseFloat(value);
          if (!value) {
            return "Margin cannot be empty.";
          } else if (valueFloat < 0) {
            return "Margin cannot be less than 0.";
          } else if (valueFloat > 100) {
            return "Margin cannot be greater than 100.";
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
    setProducts((prev) => prev.filter(({ id }) => id !== productId));
  }, []);

  async function handleSelectProducts() {
    const products = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      showArchived: false,
      showDraft: false,
    });
    if (products) {
      const productIds = products.map(({ id }) => id);
      const idToStoreUrl = await getIdToStoreUrl(productIds);
      console.log(products);
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
              ({ id, title, sku, inventoryQuantity, price }) => ({
                id: id ?? "",
                title: title ?? "",
                sku: sku ?? "",
                inventoryQuantity: inventoryQuantity ?? 0,
                price: price ?? "",
              }),
            ),
          };
        },
      );

      setProducts((prev) => {
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
                  <ProductFilterControl onQueryFocus={handleSelectProducts} />
                  {products.length > 0 && (
                    <IndexTable
                      onSelectionChange={handleSelectionChange}
                      selectedItemsCount={
                        allResourcesSelected ? "All" : selectedResources.length
                      }
                      resourceName={resourceName}
                      itemCount={numRows}
                      headings={headings}
                    >
                      {products.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          margin={fields.margin.value}
                          pricingStrategy={fields.pricingStrategy.value}
                        />
                      ))}
                    </IndexTable>
                  )}
                  <Box paddingBlockEnd={"100"} />
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
const ProductTableRow: FC<ProductTableRowProps> = (props) => {
  const { product, margin, pricingStrategy } = props;

  const { images, title, variants, totalVariants } = product;
  const primaryImage = images && images[0] ? images[0].originalSrc : ImageIcon;
  const isSingleVariant =
    variants.length === 1 && variants.length === totalVariants;

  if (isSingleVariant) {
    const firstVariant = variants[0];
    // TODO: add wholesale price
    const retailerPayment =
      pricingStrategy === "MARGIN"
        ? round(Number(firstVariant.price) * (Number(margin) / 100), 2)
        : Number(firstVariant.price) - 0;
    const profit = round(Number(firstVariant.price) - retailerPayment, 2);

    return (
      <IndexTable.Row
        rowType="data"
        selectionRange={[1, 1]}
        id={firstVariant.id}
        position={1}
        selected={false}
      >
        <IndexTable.Cell scope={"row"}>
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Thumbnail
              source={primaryImage}
              alt={`${title} image`}
              size={"small"}
            />
            <BlockStack>
              <Text as="span" variant="headingSm">
                {title}
              </Text>
              {firstVariant.sku && (
                <Text as="span" variant="headingSm">
                  Sku: {firstVariant.sku}
                </Text>
              )}
            </BlockStack>
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell>${firstVariant.price}</IndexTable.Cell>
        <IndexTable.Cell>${retailerPayment}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="p" variant="headingSm" tone="success">
            ${profit}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  }

  // case: multiple variants
  return (
    <Fragment key={product.id}>
      <IndexTable.Row
        rowType="data"
        selectionRange={[1, 1]}
        id={product.id}
        position={1}
        selected={false}
      >
        <IndexTable.Cell scope="col">
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Thumbnail
              source={primaryImage}
              alt={`${title} image`}
              size={"small"}
            />

            <Text as="span" variant="headingSm">
              {title}
            </Text>
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell />
        <IndexTable.Cell />
        <IndexTable.Cell />
      </IndexTable.Row>
      {variants.map(({ id, title, sku, price }) => (
        <IndexTable.Row
          rowType="child"
          key={id}
          id={id}
          position={1}
          selected={false}
        >
          <IndexTable.Cell scope="row">
            <BlockStack>
              <Text as="span" variant="headingSm">
                {title}
              </Text>
              {sku && (
                <Text as="span" variant="headingSm">
                  Sku: {sku}
                </Text>
              )}
            </BlockStack>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric>
              {price}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span">Not Impl</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span">Not Impl</Text>
          </IndexTable.Cell>
        </IndexTable.Row>
      ))}
    </Fragment>
  );
};

export default EditPriceList;
