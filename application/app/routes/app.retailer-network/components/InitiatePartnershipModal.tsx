import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../constants';
import { useMemo, type FC } from 'react';
import { useNavigation, useSubmit as useRemixSubmit } from '@remix-run/react';
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

const PriceListRequestModal: FC<Props> = ({
  selectedRetailerId,
  priceLists,
  selectedPriceListIds,
  handleSelectPriceListIds,
}) => {
  const remixSubmit = useRemixSubmit();
  const navigate = useNavigation();
  const isSubmitting = navigate.state === 'submitting';

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

  const { submit } = useSubmit(async (fieldValues) => {
    const newFieldValues = {
      ...fieldValues,
      priceListIds: JSON.stringify(selectedPriceListIds),
    };
    remixSubmit(newFieldValues, { method: 'post' });
    return { status: 'success' };
  }, fields);

  const choices = useMemo(
    () =>
      priceLists.map((priceList) => ({
        label: priceList.name,
        value: priceList.id,
      })),
    [priceLists],
  );

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
        <button variant="primary" onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? 'Initiating Partnership' : 'Initiate Partnership'}
        </button>
      </TitleBar>
    </Modal>
  );
};

export default PriceListRequestModal;
