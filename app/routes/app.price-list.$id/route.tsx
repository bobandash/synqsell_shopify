import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from '@remix-run/node';
import {
  useActionData,
  useLoaderData,
  useLocation,
  useParams,
  useSubmit as useRemixSubmit,
  useSearchParams,
} from '@remix-run/react';
import {
  Banner,
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
  Link,
  Listbox,
  Page,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
  useIndexResourceState,
  type IndexTableProps,
} from '@shopify/polaris';
import { asChoiceList, notEmpty, useField, useForm } from '@shopify/react-form';
import { StatusCodes } from 'http-status-codes';
import {
  PRICE_LIST_CATEGORY,
  PRICE_LIST_IMPORT_SETTINGS,
  PRICE_LIST_PRICING_STRATEGY,
} from '~/constants';

import { authenticate } from '~/shopify.server';
import { convertFormDataToObject, getJSONError } from '~/util';
import {
  categoryChoices,
  formatPriceListFields,
  generalPriceListImportSettingChoices,
  pricingStrategyChoices,
} from '~/routes/app.price-list.$id/formData/pricelist';
import type { PriceListPricingStrategyProps } from '~/routes/app.price-list.$id/formData/pricelist';
import { useAppBridge } from '@shopify/app-bridge-react';
import { PaddedBox, ProductFilterControl } from '~/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchIcon, XIcon } from '@shopify/polaris-icons';
import {
  calculatePriceDifference,
  calculateRetailerPayment,
  getProductsFormattedWithPositions,
  getVariantIdToWholesalePrice,
} from './util';
import type {
  ProductProps,
  VariantWithPosition,
  Settings,
  PriceListActionData,
  ProductPropsWithPositions,
} from './types';
import ProductTableRow from './components/ProductTableRow';
import { type BulkActionsProps } from '@shopify/polaris/build/ts/src/components/BulkActions';
import styles from '~/shared.module.css';
import { userHasPriceList } from '~/services/models/priceList';
import { getExistingPriceListData } from './loader/getExistingPriceListData';
import { getNewPriceListData } from './loader/getNewPriceListData';
import type { PartnershipRowData } from './loader/getPartnershipData';
import {
  createPriceListAndCompleteChecklistItemAction,
  updateAllPriceListInformationAction,
} from './actions';
import createHttpError from 'http-errors';
import getJSONBadgeError from '~/util/getJSONBadgeError';

type LoaderDataProps = {
  settingsData: Settings;
  productsData: ProductPropsWithPositions[];
  partnershipsData: PartnershipRowData[];
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const {
      session,
      admin: { graphql },
    } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const formData = await request.formData();
    const { id: priceListId } = params;
    if (!priceListId) {
      throw json('There is no price list id.', {
        status: StatusCodes.BAD_REQUEST,
      });
    }
    const data = convertFormDataToObject(formData);
    if (priceListId === 'new') {
      return await createPriceListAndCompleteChecklistItemAction(
        data as PriceListActionData,
        sessionId,
      );
    }
    return await updateAllPriceListInformationAction(
      priceListId,
      data as PriceListActionData,
      sessionId,
    );
  } catch (error) {
    if (error instanceof createHttpError.BadRequest) {
      return getJSONBadgeError({
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    throw getJSONError(error, 'settings');
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const {
      session,
      admin: { graphql },
    } = await authenticate.admin(request);
    const { id: sessionId } = session;
    const { id: priceListId } = params;
    const isNew = priceListId === 'new';
    let data = null;

    if (!priceListId) {
      throw json('Price list id is empty', {
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const hasPriceList = await userHasPriceList(sessionId, priceListId);
    if (!isNew && !hasPriceList) {
      throw json('User does not have price list.', {
        status: StatusCodes.BAD_REQUEST,
      });
    }

    if (!isNew) {
      data = await getExistingPriceListData(sessionId, priceListId, graphql);
    } else {
      data = await getNewPriceListData(sessionId);
    }
    return json(data, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'price list');
  }
};

const CreateEditPriceList = () => {
  const location = useLocation();
  const { settingsData, productsData, partnershipsData } = useLoaderData<
    typeof loader
  >() as LoaderDataProps;
  const actionData = useActionData<typeof action>();
  const params = useParams();
  const isCreatingNewPriceList = params.id && params.id === 'new';
  const { pathname } = useLocation();
  const backActionUrl = pathname.substring(0, pathname.lastIndexOf('/'));
  const shopify = useAppBridge();
  const remixSubmit = useRemixSubmit();
  const [products, setProducts] =
    useState<ProductPropsWithPositions[]>(productsData);
  const [partneredRetailers] = useState<PartnershipRowData[]>(partnershipsData);
  const initialSelectedRetailers = useMemo(() => {
    return partneredRetailers
      .filter(({ selected }) => selected === true)
      .map(({ id }) => id);
  }, [partneredRetailers]);
  const [visibleRetailerOptions, setVisibleRetailerOptions] =
    useState<PartnershipRowData[]>(partneredRetailers);
  const [selectedPartnershipIds, setSelectedPartnershipIds] = useState<
    string[]
  >(initialSelectedRetailers);
  const [retailerSearchValue, setRetailerSearchValue] = useState('');
  const [hasCreatePriceListBanner, setHasCreatePriceListBanner] =
    useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // write message with feedback
  useEffect(() => {
    if (actionData && 'message' in actionData) {
      shopify.toast.show(actionData.message);
      setError('');
    } else if (
      actionData &&
      'error' in actionData &&
      'message' in actionData.error
    ) {
      shopify.toast.show('Error: see above.', {
        isError: true,
      });
      setError(actionData.error.message);
    }
  }, [actionData, shopify]);

  useEffect(() => {
    if (searchParams.get('referrer') === 'new') {
      setSearchParams();
      setHasCreatePriceListBanner(true);
      shopify.toast.show('Successfully created price list.');
    } else if (location.pathname.slice(-3) === 'new') {
      setHasCreatePriceListBanner(false);
      setError('');
    }
  }, [searchParams, setSearchParams, location, shopify]);

  const escapeSpecialRegExCharacters = useCallback(
    (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    [],
  );

  const filterRetailerOptions = useCallback(
    (value: string) => {
      setRetailerSearchValue(value);
      if (value === '') {
        setVisibleRetailerOptions(partneredRetailers);
        return;
      }
      const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), 'i');
      const resultOptions = partneredRetailers.filter(({ retailerName }) =>
        retailerName.match(filterRegex),
      );
      setVisibleRetailerOptions(resultOptions);
    },
    [partneredRetailers, escapeSpecialRegExCharacters],
  );

  const updateRetailerSelection = useCallback(
    (selected: string) => {
      if (selectedPartnershipIds.includes(selected)) {
        setSelectedPartnershipIds(
          selectedPartnershipIds.filter((option) => option !== selected),
        );
      } else {
        setSelectedPartnershipIds([...selectedPartnershipIds, selected]);
      }
    },
    [selectedPartnershipIds],
  );

  const dismissPriceListBanner = useCallback(() => {
    setHasCreatePriceListBanner(false);
  }, []);

  const dismissErrorBanner = useCallback(() => {
    setError('');
  }, []);

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
    singular: 'product',
    plural: 'products',
  };

  const headings: IndexTableProps['headings'] = [
    { title: 'Product' },
    { title: 'Price' },
    { title: 'Retailer Payment' },
    { title: 'Profit' },
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

  const productsBulkAction: BulkActionsProps['promotedActions'] = [
    {
      content: 'Remove Products',
      onAction: removeProductsIndexTable,
    },
  ];

  const { fields, submit } = useForm({
    fields: {
      name: useField({
        value: settingsData.name,
        validates: [notEmpty('Price list name is required')],
      }),
      category: useField(
        settingsData.isGeneral
          ? PRICE_LIST_CATEGORY.GENERAL
          : PRICE_LIST_CATEGORY.PRIVATE,
      ),
      generalPriceListImportSettings: useField(
        settingsData.requiresApprovalToImport
          ? PRICE_LIST_IMPORT_SETTINGS.APPROVAL
          : PRICE_LIST_IMPORT_SETTINGS.NO_APPROVAL,
      ),
      pricingStrategy: useField<PriceListPricingStrategyProps>(
        settingsData.pricingStrategy,
      ),
      margin: useField({
        value: settingsData.margin.toString() ?? '10',
        validates: (value) => {
          const valueFloat = parseFloat(value);
          if (!value) {
            return 'Margin cannot be empty.';
          } else if (valueFloat < 0) {
            return 'Margin cannot be less than 0.';
          } else if (valueFloat > 100) {
            return 'Margin cannot be greater than 100.';
          } else if (
            fields.category.value === PRICE_LIST_CATEGORY.GENERAL &&
            valueFloat < 10
          ) {
            return 'Retailer must have at least 10% margin for general price list';
          }
        },
      }),
    },
    onSubmit: async (fieldValues) => {
      const formattedFieldData = formatPriceListFields(fieldValues);
      const formattedProductsData = getCleanedProductDataForSubmission();
      remixSubmit(
        {
          settings: JSON.stringify(formattedFieldData),
          products: JSON.stringify(formattedProductsData),
          partnerships: JSON.stringify(selectedPartnershipIds),
        },
        {
          method: 'post',
          action: pathname,
        },
      );
      return { status: 'success' };
    },
  });

  async function getIdToStoreUrl(productIds: string[]) {
    const params = {
      productIds,
    };
    const encodedParams = encodeURIComponent(JSON.stringify(params));
    const response = await fetch(
      `/app/api/price-list?params=${encodedParams}`,
      {
        method: 'GET',
      },
    );
    const data = await response.json();
    return data;
  }

  async function handleSelectProducts() {
    // Mandatory field for to set shopify resource picker's initial values
    const resourcePickerInitialSelection = products.map((product) => ({
      id: product.id,
      variants: product.variants.map(({ id }) => ({ id })),
    }));

    const productsSelected = await shopify.resourcePicker({
      type: 'product',
      multiple: true,
      action: 'select',
      showArchived: false,
      showDraft: false,
      selectionIds: resourcePickerInitialSelection,
    });

    if (productsSelected) {
      const productIds = productsSelected.map(({ id }) => id);
      const idToStoreUrl = await getIdToStoreUrl(productIds);
      const variantIdToWholesalePrice = getVariantIdToWholesalePrice(products);
      // only get the relevant information needed to render the UI
      const productsFormatted: ProductProps[] = productsSelected.map(
        ({ id, title, images, variants, totalVariants }) => {
          return {
            id,
            title,
            images,
            storeUrl: idToStoreUrl[id] ?? '',
            totalVariants,
            variants: variants.map(({ id, title, sku, price }) => ({
              id: id ?? '',
              title: title ?? null,
              sku: sku ?? null,
              price: price ?? null,
              wholesalePrice: variantIdToWholesalePrice.get(id ?? '') ?? null,
            })),
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
  const getCleanedProductDataForSubmission = useCallback(() => {
    return products.map(
      ({ id: shopifyProductId, variants }) => {
        return {
          shopifyProductId,
          variants: variants.map((variant) => {
            const retailerPayment = calculateRetailerPayment({
              isWholesalePriceList:
                fields.pricingStrategy.value ===
                PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
              margin: fields.margin.value,
              wholesalePrice: variant.wholesalePrice,
              hasError: false,
              price: variant.price,
            });
            const supplierProfit = calculatePriceDifference(
              variant.price,
              retailerPayment,
            );
            return {
              shopifyVariantId: variant.id,
              retailPrice: variant.price,
              retailerPayment: retailerPayment,
              supplierProfit: supplierProfit,
            };
          }),
        };
      },
      [fields, products],
    );
  }, [fields, products]);
  return (
    <Form onSubmit={submit}>
      <Layout>
        <Page
          title={isCreatingNewPriceList ? `New Price List` : `Edit Price List`}
          backAction={{ content: 'Price Lists', url: backActionUrl }}
        >
          {error && (
            <>
              <Banner
                title={error}
                tone="warning"
                onDismiss={dismissErrorBanner}
              />
              <PaddedBox />
            </>
          )}
          {hasCreatePriceListBanner && (
            <>
              <Banner
                title="Your price list was successfully created."
                tone="success"
                onDismiss={dismissPriceListBanner}
              >
                <p>
                  Add products and retailers to your price list and begin
                  selling, or{' '}
                  <Link url="/app/price-list/new">add another price list</Link>!
                </p>
              </Banner>
              <PaddedBox />
            </>
          )}
          <Box paddingBlockEnd={'400'}>
            <BlockStack gap="400">
              <Card>
                <TextField label="Name" autoComplete="off" {...fields.name} />
              </Card>
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
                        {visibleRetailerOptions.map(({ id, retailerName }) => {
                          return (
                            <Listbox.Option
                              key={id}
                              value={id}
                              selected={selectedPartnershipIds.includes(id)}
                              accessibilityLabel={retailerName}
                            >
                              {retailerName}
                            </Listbox.Option>
                          );
                        })}
                      </Listbox>
                    ) : null}
                  </Combobox>
                  <ResourceList
                    resourceName={{
                      singular: 'customer',
                      plural: 'customers',
                    }}
                    items={partneredRetailers.filter(({ id }) =>
                      selectedPartnershipIds.includes(id),
                    )}
                    renderItem={(item) => {
                      const { id, retailerName } = item;
                      return (
                        <ResourceItem
                          id={id}
                          url={''}
                          accessibilityLabel={`View details for ${retailerName}`}
                        >
                          <InlineStack
                            blockAlign="center"
                            align="space-between"
                          >
                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                              {retailerName}
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
              <Card padding={'200'}>
                <Box paddingInline={'200'} paddingBlockStart={'100'}>
                  <Text as="h2" variant="headingMd">
                    Products
                  </Text>
                </Box>
                <ProductFilterControl onQueryFocus={handleSelectProducts} />
                {products.length > 0 && (
                  <IndexTable
                    onSelectionChange={handleSelectionChange}
                    selectedItemsCount={
                      allResourcesSelected ? 'All' : selectedResources.length
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
                          fields.pricingStrategy.value === 'WHOLESALE'
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
                <Box paddingBlockEnd={'100'} />
              </Card>
            </BlockStack>
          </Box>
          <div className={styles['center-right']}>
            <Button submit variant="primary">
              Save
            </Button>
          </div>
          <PaddedBox />
        </Page>
      </Layout>
    </Form>
  );
};

export default CreateEditPriceList;
