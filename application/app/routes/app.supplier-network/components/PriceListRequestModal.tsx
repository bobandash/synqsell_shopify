import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../constants';
import type { FC } from 'react';
import { useSubmit as useRemixSubmit } from '@remix-run/react';
import { Form, TextField } from '@shopify/polaris';
import { notEmpty, useField, useForm, useSubmit } from '@shopify/react-form';

type Props = {
  priceListSupplierId: string;
};

const PriceListRequestModal: FC<Props> = ({ priceListSupplierId }) => {
  const remixSubmit = useRemixSubmit();
  // priceListSupplierId denotes the session Id of the price list owner
  const { fields } = useForm({
    fields: {
      intent: useField(INTENTS.REQUEST_ACCESS),
      priceListSupplierId: useField(priceListSupplierId),
      message: useField({
        value: '',
        validates: [notEmpty('Message is required.')],
      }),
    },
  });

  const { submit, submitting } = useSubmit(async (fieldValues) => {
    remixSubmit(fieldValues, { method: 'post' });
    return { status: 'success' };
  }, fields);

  return (
    <Modal id={MODALS.REQUEST_ACCESS_MODAL}>
      <div style={{ padding: '1rem' }}>
        <p style={{ paddingBottom: '0.25rem' }}>
          Explain how this partnership will create value and benefits for both
          parties involved!
        </p>
        <Form onSubmit={submit}>
          <TextField
            label="Message:"
            labelHidden
            autoComplete="off"
            multiline={4}
            {...fields.message}
          />
        </Form>
      </div>
      <TitleBar title="Request Access">
        <button variant="primary" onClick={submit} disabled={submitting}>
          Request Access
        </button>
      </TitleBar>
    </Modal>
  );
};

export default PriceListRequestModal;
