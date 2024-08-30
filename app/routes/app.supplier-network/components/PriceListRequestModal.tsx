import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { MODALS } from '../constants';
import type { FC } from 'react';
import { useFetcher } from '@remix-run/react';
import { TextField } from '@shopify/polaris';
import { notEmpty, useField, useForm, useSubmit } from '@shopify/react-form';

type Props = {
  priceListSupplierId: string;
};

const PriceListRequestModal: FC<Props> = ({ priceListSupplierId }) => {
  const fetcher = useFetcher();
  // priceListSupplierId denotes the session Id of the price list owner

  const { fields } = useForm({
    fields: {
      intent: useField(MODALS.REQUEST_ACCESS_MODAL),
      priceListSupplierId: useField(priceListSupplierId),
      message: useField({
        value: '',
        validates: [notEmpty('Message is required.')],
      }),
    },
  });

  const { submit, submitting, errors, setErrors } = useSubmit(
    async (fieldValues) => {
      const remoteErrors = [];
      console.log('test');
      if (remoteErrors.length > 0) {
        return { status: 'fail', errors: [] };
      }

      return { status: 'success' };
    },
    fields,
  );

  return (
    <Modal id={MODALS.REQUEST_ACCESS_MODAL}>
      <div style={{ padding: '1rem' }}>
        <p style={{ paddingBottom: '0.25rem' }}>
          Explain how this partnership will create value and benefits for both
          parties involved!
        </p>
        <fetcher.Form onSubmit={submit}>
          <TextField
            label="Message:"
            autoComplete="off"
            multiline={4}
            {...fields.message}
          />
        </fetcher.Form>
      </div>
      <TitleBar title="Request Access">
        <button variant="primary" onClick={submit}>
          Request Access
        </button>
      </TitleBar>
    </Modal>
  );
};

export default PriceListRequestModal;
