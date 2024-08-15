import { useLocation } from "@remix-run/react";
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
import {
  PRICE_LIST_CATEGORY,
  PRICE_LIST_IMPORT_SETTINGS,
  PRICE_LIST_PRICING_STRATEGY,
} from "~/constants";
import styles from "~/shared.module.css";

const NewPriceList = () => {
  const location = useLocation();
  const backActionUrl = location.pathname.replace("/new", "");

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

  const { fields } = useForm({
    fields: {
      name: useField({
        value: "",
        validates: [notEmpty("Store name is required")],
      }),
      category: useField(PRICE_LIST_CATEGORY.GENERAL),
      generalPricelistImportSettings: useField(
        PRICE_LIST_IMPORT_SETTINGS.APPROVAL,
      ),
      pricingStrategy: useField(PRICE_LIST_PRICING_STRATEGY.MARGIN),
      margin: useField({
        value: "0",
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
  });

  return (
    <Form onSubmit={() => {}}>
      <Page
        title="Create Price List"
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
                  <ChoiceList
                    {...asChoiceList(fields.generalPricelistImportSettings)}
                    title="Product Import Settings"
                    choices={generalPriceListImportSettingChoices}
                  />
                  <ChoiceList
                    {...asChoiceList(fields.pricingStrategy)}
                    title="Pricing Strategy"
                    choices={pricingStrategyChoices}
                  />
                  <TextField
                    type="number"
                    label="Margin (%) that Retailer Generates on Sale"
                    autoComplete="off"
                    {...fields.margin}
                  />
                </FormLayout>
              </Card>
            </Layout.AnnotatedSection>
          </Layout>
        </Box>
        <div className={styles["center-right"]}>
          <Button submit variant="primary">
            Create Price List
          </Button>
        </div>
      </Page>
    </Form>
  );
};

export default NewPriceList;
