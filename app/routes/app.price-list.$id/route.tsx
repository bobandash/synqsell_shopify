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
  Avatar,
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  Filters,
  Form,
  FormLayout,
  Layout,
  Page,
  ResourceList,
  Text,
  TextField,
} from "@shopify/polaris";
import { asChoiceList, notEmpty, useField, useForm } from "@shopify/react-form";
import type { Field, FormMapping } from "@shopify/react-form";
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
  generalPriceListImportSettingChoices,
  pricingStrategyChoices,
} from "~/formData/pricelist";
import { useAppBridge } from "@shopify/app-bridge-react";

type FieldValueProps = FormMapping<
  {
    name: Field<string>;
    category: Field<string>;
    generalPriceListImportSettings: Field<string>;
    pricingStrategy: Field<string>;
    margin: Field<string>;
  },
  "value"
>;

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

  // Match data needed to submit to backend
  function getFormattedData(fieldValues: FieldValueProps) {
    const {
      name,
      category,
      generalPriceListImportSettings,
      pricingStrategy,
      margin,
    } = fieldValues;

    return {
      name,
      isGeneral: category === PRICE_LIST_CATEGORY.GENERAL ? true : false,
      pricingStrategy,
      ...(category === PRICE_LIST_CATEGORY.GENERAL && {
        requiresApprovalToImport:
          generalPriceListImportSettings === PRICE_LIST_IMPORT_SETTINGS.APPROVAL
            ? true
            : false,
      }),
      ...(pricingStrategy === PRICE_LIST_PRICING_STRATEGY.MARGIN && {
        margin: parseFloat(margin),
      }),
    };
  }

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
      const formattedData = getFormattedData(fieldValues);
      remixSubmit(formattedData, {
        method: "post",
        action: location.pathname,
      });
      return { status: "success" };
    },
  });

  const filters = [
    {
      key: "products",
      label: "Products",
      filter: (
        <TextField
          label=""
          value={""}
          onChange={() => {}}
          autoComplete="off"
          labelHidden
        />
      ),
      shortcut: true,
    },
  ];

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
                <Card padding={"100"}>
                  <ResourceList
                    resourceName={{ singular: "product", plural: "products" }}
                    flushFilters={true}
                    filterControl={
                      <Filters
                        queryValue={""}
                        filters={filters}
                        appliedFilters={[]}
                        onQueryChange={() => {}}
                        onQueryClear={() => {}}
                        onClearAll={() => {}}
                        hideFilters={true}
                        queryPlaceholder="Add Products"
                        onQueryFocus={async () => {
                          await shopify.resourcePicker({
                            type: "product",
                          });
                        }}
                      />
                    }
                    items={[
                      {
                        id: "341",
                        url: "#",
                        name: "Mae Jemison",
                        location: "Decatur, USA",
                      },
                    ]}
                    renderItem={(item) => {
                      const { id, url, name, location } = item;
                      const media = <Avatar customer size="md" name={name} />;

                      return (
                        <ResourceList.Item
                          id={id}
                          url={url}
                          media={media}
                          accessibilityLabel={`View details for ${name}`}
                        >
                          <Text as="h3" variant="bodyMd" fontWeight="bold">
                            {name}
                          </Text>
                          <div>{location}</div>
                        </ResourceList.Item>
                      );
                    }}
                  ></ResourceList>
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

export default EditPriceList;
