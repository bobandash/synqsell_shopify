import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../constants';
import { useMemo, type FC } from 'react';
import { useSubmit as useRemixSubmit } from '@remix-run/react';
import { BlockStack, Form, TextField, ChoiceList } from '@shopify/polaris';
import { notEmpty, useField, useForm, useSubmit } from '@shopify/react-form';
import type { PriceListJsonify } from '../loader/getRetailerPaginatedInfo';
import sharedStyles from '~/shared.module.css';

type Props = {
  selectedRetailerId: string;
  priceLists: PriceListJsonify[];
  selectedPriceListIds: string[];
  handleSelectPriceListIds: (priceListIds: string[]) => void;
};

// TODO: shopify's useForm doesn't currently support validation for select multiple, so you have to handle the error that the supplier did not select a price list manually
const PriceListRequestModal: FC<Props> = ({
  selectedRetailerId,
  priceLists,
  selectedPriceListIds,
  handleSelectPriceListIds,
}) => {
  const remixSubmit = useRemixSubmit();

  const { fields } = useForm({
    fields: {
      intent: useField(INTENTS.INITIATE_PARTNERSHIP),
      retailerId: useField(selectedRetailerId),
      message: useField({
        value: '',
        validates: [notEmpty('Message is required.')],
      }),
    },
  });

  const { submit, submitting } = useSubmit(async (fieldValues) => {
    const newFieldValues = {
      ...fieldValues,
      priceListIds: JSON.stringify(selectedPriceListIds),
    };
    remixSubmit(newFieldValues, { method: 'post' });
    return { status: 'success' };
  }, fields);

  const choices = useMemo(() => {
    return priceLists.map((priceList) => {
      return {
        label: priceList.name,
        value: priceList.id,
      };
    });
  }, [priceLists]);

  return (
    <Modal id={MODALS.INITIATE_PARTNERSHIP}>
      <div style={{ padding: '1rem' }}>
        <p style={{ paddingBottom: '0.25rem', fontWeight: 'bold' }}>
          Explain how this partnership will create value and benefits for both
          parties involved!
        </p>
        <Form onSubmit={submit}>
          <BlockStack gap="200">
            <div className={sharedStyles['choice-list-container']}>
              <ChoiceList
                allowMultiple
                title="Price Lists To Grant Access:"
                choices={choices}
                selected={selectedPriceListIds}
                onChange={handleSelectPriceListIds}
              />
            </div>
            <TextField
              label="Message:"
              autoComplete="off"
              multiline={4}
              {...fields.message}
            />
          </BlockStack>
        </Form>
      </div>
      <TitleBar title="Initiate Partnership">
        <button variant="primary" onClick={submit} disabled={submitting}>
          Initiate Partnership
        </button>
      </TitleBar>
    </Modal>
  );
};

export default PriceListRequestModal;
