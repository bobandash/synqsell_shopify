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
  Box,
  Button,
  Card,
  ChoiceList,
  type ChoiceListProps,
  Form,
  FormLayout,
  Layout,
  Page,
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
  const remixSubmit = useRemixSubmit();

  const categoryChoices: ChoiceListProps["choices"] = [
    {
      label: "General",
      value: PRICE_LIST_CATEGORY.GENERAL,
      helpText:
        "Products visible to all retailers within the retailer network.",
    },
    {
      label: "Private",
      value: PRICE_LIST_CATEGORY.PRIVATE,
      helpText: "Accessible only to authorized retailers with granted access.",
    },
  ];

  const generalPriceListImportSettingChoices: ChoiceListProps["choices"] = [
    {
      label: "No Approval",
      value: PRICE_LIST_IMPORT_SETTINGS.NO_APPROVAL,
      helpText:
        "Allow any retailers from the retailer network to import products from the general price list without approval.",
    },
    {
      label: "Requires Approval",
      value: PRICE_LIST_IMPORT_SETTINGS.APPROVAL,
      helpText:
        "Prohibit retailers from importing products from the general price list unless you accept their retailer request.",
    },
  ];

  const pricingStrategyChoices: ChoiceListProps["choices"] = [
    {
      label: "Margin",
      value: PRICE_LIST_PRICING_STRATEGY.MARGIN,
      helpText:
        "Retailer who imports your products gets a percentage of the retail price when they make a sale.",
    },
    {
      label: "Wholesale Price",
      value: PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
      helpText:
        "Retailer who imports your product gets the difference between the retail price and wholesale price when they make a sale.",
    },
  ];

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

  return (
    <Form onSubmit={submit}>
      <Page
        title="Edit Price List"
        backAction={{ content: "Price Lists", url: backActionUrl }}
      >
        <Box paddingBlockEnd={"400"}>
          <Layout>
            <Layout.AnnotatedSection
              id="settings"
              title="Settings"
              description="Modify the price list settings according to what works best for you and the retailers."
            >
              <Card>
                <FormLayout>
                  <TextField label="Name" autoComplete="off" {...fields.name} />
                  <ChoiceList
                    {...asChoiceList(fields.category)}
                    title="Category"
                    choices={categoryChoices}
                  />
                  {fields.category.value === PRICE_LIST_CATEGORY.GENERAL && (
                    <ChoiceList
                      {...asChoiceList(fields.generalPriceListImportSettings)}
                      title="Product Import Settings"
                      choices={generalPriceListImportSettingChoices}
                    />
                  )}

                  <ChoiceList
                    {...asChoiceList(fields.pricingStrategy)}
                    title="Pricing Strategy"
                    choices={pricingStrategyChoices}
                  />
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
            </Layout.AnnotatedSection>
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
