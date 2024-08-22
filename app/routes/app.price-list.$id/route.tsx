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
  Combobox,
  Form,
  FormLayout,
  Icon,
  IndexTable,
  InlineStack,
  Layout,
  Listbox,
  Page,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
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
import { useCallback, useMemo, useState } from "react";
import { SearchIcon, XIcon } from "@shopify/polaris-icons";
import {
  getProductsFormattedWithPositions,
  getVariantIdToWholesalePrice,
} from "./util";
import type {
  ProductPropsWithPositions,
  ProductProps,
  VariantWithPosition,
} from "./types";
import ProductTableRow from "./components/ProductTableRow";
import { type BulkActionsProps } from "@shopify/polaris/build/ts/src/components/BulkActions";

import styles from "~/shared.module.css";

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

type PartneredRetailersProps = {
  id: string;
  name: string;
  website: string;
  selected: boolean;
};

// !!! TODOs for this page:
// !!! Before I start, I need to figure out the product data that I need to store
// !!! I have to store all the data on my server/db because I can't query their store without their session id
// !!! The payload for now for products will be whatever I determine

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
  const [products, setProducts] = useState<ProductPropsWithPositions[]>([]);

  // todo: fetch this information
  const allPartneredRetailers: PartneredRetailersProps[] = useMemo(
    () => [
      {
        id: "retailer-id",
        name: "Eppeal",
        website: "/app/retailer-network/retailer-id", // TODO: make this in the frontend
        selected: true,
      },
    ],
    [],
  );

  const initialSelectedRetailers = useMemo(() => {
    return allPartneredRetailers
      .filter(({ selected }) => selected === true)
      .map(({ id }) => id);
  }, [allPartneredRetailers]);

  const [visibleRetailerOptions, setVisibleRetailerOptions] = useState<
    PartneredRetailersProps[]
  >(allPartneredRetailers);

  const [selectedRetailerIds, setSelectedRetailerIds] = useState<string[]>(
    initialSelectedRetailers,
  );
  const [retailerSearchValue, setRetailerSearchValue] = useState("");
  const escapeSpecialRegExCharacters = useCallback(
    (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );
  const filterRetailerOptions = useCallback(
    (value: string) => {
      setRetailerSearchValue(value);
      if (value === "") {
        setVisibleRetailerOptions(allPartneredRetailers);
        return;
      }
      const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), "i");
      const resultOptions = allPartneredRetailers.filter((retailer) =>
        retailer.name.match(filterRegex),
      );
      setVisibleRetailerOptions(resultOptions);
    },
    [allPartneredRetailers, escapeSpecialRegExCharacters],
  );

  const updateRetailerSelection = useCallback(
    (selected: string) => {
      console.log(selected);
      if (selectedRetailerIds.includes(selected)) {
        setSelectedRetailerIds(
          selectedRetailerIds.filter((option) => option !== selected),
        );
      } else {
        setSelectedRetailerIds([...selectedRetailerIds, selected]);
      }
    },
    [selectedRetailerIds],
  );

  // in order for the non-nested fields to select the nested rows, you have to create an array of objects of the variants
  // and get the indexes of the nested fields
  const tableRows = useMemo(() => {
    const rows: VariantWithPosition[] = [];
    products.map(({ variants }) =>
      variants.map((variant) => rows.push({ ...variant })),
    );
    return rows;
  }, [products]);

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(tableRows);

  // Mandatory fields for index table (products)
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
    { title: "Profit" },
  ];

  // removes the selected products from index table
  const removeProductsIndexTable = useCallback(() => {
    const selectedVariantIdSet = new Set(selectedResources);
    const newProducts = products
      .map(({ variants, ...rest }) => {
        return {
          ...rest,
          variants: variants.filter((variant) => {
            return !selectedVariantIdSet.has(variant.id);
          }),
        };
      })
      .filter(({ variants }) => variants.length > 0);
    const newProductsWithUpdatedPosition =
      getProductsFormattedWithPositions(newProducts);
    setProducts([...newProductsWithUpdatedPosition]);
    clearSelection();
  }, [clearSelection, products, selectedResources]);

  const productsBulkAction: BulkActionsProps["promotedActions"] = [
    {
      content: "Remove Products",
      onAction: removeProductsIndexTable,
    },
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

  async function handleSelectProducts() {
    // Mandatory field for to set shopify resource picker's initial values
    const resourcePickerInitialSelection =
      products.map((product) => ({
        id: product.id,
        variants: product.variants.map((variant) => ({ id: variant.id })),
      })) ?? [];

    const productsSelected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      showArchived: false,
      showDraft: false,
      selectionIds: resourcePickerInitialSelection,
    });
    if (productsSelected) {
      const productIds = productsSelected.map(({ id }) => id);
      const idToStoreUrl = await getIdToStoreUrl(productIds);
      const variantIdToWholesalePrice = getVariantIdToWholesalePrice(products);
      const productsFormatted: ProductProps[] = productsSelected.map(
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
                wholesalePrice: variantIdToWholesalePrice.get(id) ?? null,
              }),
            ),
          };
        },
      );
      const newProducts = getProductsFormattedWithPositions(productsFormatted);
      setProducts([...newProducts]);
    }
  }

  // functions related to updating wholesale price for products
  // this function is for when submitting with margin and edit the wholesale prices before

  // update wholesale price for specific product and variant
  const updateProductWholesalePrice = useCallback(
    (productId: string, variantId: string, wholesalePrice: number) => {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                variants: product.variants.map((variant) =>
                  variant.id === variantId
                    ? { ...variant, wholesalePrice }
                    : variant,
                ),
              }
            : product,
        ),
      );
    },
    [],
  );
  // cleans product data before submission
  // Default behavior: want the wholesale price to persist if the seller changes their mind on pricing strategy before refreshing / navigating the page
  const getCleanedProductDataForSubmission = useCallback(() => {
    if (fields.margin.value === PRICE_LIST_PRICING_STRATEGY.MARGIN) {
      return products;
    }
    return products.map((product) => {
      return {
        ...product,
        variants: product.variants.map((variant) => {
          return {
            ...variant,
            wholesalePrice: null,
          };
        }),
      };
    });
  }, [fields, products]);

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
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Retailers Connected
                    </Text>
                    <Combobox
                      allowMultiple
                      activator={
                        <Combobox.TextField
                          prefix={<Icon source={SearchIcon} />}
                          onChange={filterRetailerOptions}
                          label="Search retailers"
                          labelHidden
                          value={retailerSearchValue}
                          placeholder="Search retailers"
                          autoComplete="off"
                        />
                      }
                    >
                      {visibleRetailerOptions.length > 0 ? (
                        <Listbox onSelect={updateRetailerSelection}>
                          {visibleRetailerOptions.map(({ id, name }) => {
                            return (
                              <Listbox.Option
                                key={id}
                                value={id}
                                selected={selectedRetailerIds.includes(id)}
                                accessibilityLabel={name}
                              >
                                {name}
                              </Listbox.Option>
                            );
                          })}
                        </Listbox>
                      ) : null}
                    </Combobox>
                    <ResourceList
                      resourceName={{
                        singular: "customer",
                        plural: "customers",
                      }}
                      items={allPartneredRetailers.filter(({ id }) =>
                        selectedRetailerIds.includes(id),
                      )}
                      renderItem={(item) => {
                        const { id, name, website } = item;
                        return (
                          <ResourceItem
                            id={id}
                            url={website}
                            accessibilityLabel={`View details for ${name}`}
                          >
                            <InlineStack
                              blockAlign="center"
                              align="space-between"
                            >
                              <Text variant="bodyMd" fontWeight="bold" as="h3">
                                {name}
                              </Text>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Button
                                  icon={XIcon}
                                  onClick={() => {
                                    updateRetailerSelection(id);
                                  }}
                                />
                              </div>
                            </InlineStack>
                          </ResourceItem>
                        );
                      }}
                    />
                  </BlockStack>
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
                      promotedBulkActions={productsBulkAction}
                    >
                      {products.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          margin={fields.margin.value}
                          isWholesalePricing={
                            fields.pricingStrategy.value === "WHOLESALE"
                          }
                          selectedResources={selectedResources}
                          tableRows={tableRows}
                          updateProductWholesalePrice={
                            updateProductWholesalePrice
                          }
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
        <Box paddingBlockEnd={"400"} />
      </Page>
    </Form>
  );
};

export default EditPriceList;
