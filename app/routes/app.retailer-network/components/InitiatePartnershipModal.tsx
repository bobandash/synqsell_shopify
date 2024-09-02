import { Modal, TitleBar } from '@shopify/app-bridge-react';
import { INTENTS, MODALS } from '../constants';
import { useMemo, type FC } from 'react';
import { useSubmit as useRemixSubmit } from '@remix-run/react';
import { BlockStack, Form, TextField, ChoiceList } from '@shopify/polaris';
import { notEmpty, useField, useForm, useSubmit } from '@shopify/react-form';
import type { PriceListJsonify } from '../loader/getRetailerPaginatedInfo';

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
            <ChoiceList
              allowMultiple
              title="Price Lists To Grant Access:"
              choices={choices}
              selected={selectedPriceListIds}
              onChange={handleSelectPriceListIds}
            />
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

// TODO: Fix: resource list doesn't render in modal?
// apparently combo box is not allowed because modals inject javascript
// <Combobox
// allowMultiple
// activator={
//   <Combobox.TextField
//     prefix={<Icon source={SearchIcon} />}
//     onChange={() => {}}
//     label="Select Price Lists:"
//     value={''}
//     placeholder=""
//     autoComplete="off"
//   />
// }
// >
// {priceLists.length > 0 ? (
//   <Listbox onSelect={handleSelectPriceListId}>
//     {priceLists.map(({ id, name }) => {
//       return (
//         <Listbox.Option
//           key={id}
//           value={id}
//           selected={selectedPriceListIds.has(id)}
//           accessibilityLabel={name}
//         >
//           {name}
//         </Listbox.Option>
//       );
//     })}
//   </Listbox>
// ) : null}
// </Combobox>
// <ResourceList
// resourceName={{
//   singular: 'Price List',
//   plural: 'Price Lists',
// }}
// items={priceLists.filter(({ id }) =>
//   selectedPriceListIds.has(id),
// )}
// renderItem={(item) => {
//   const { id, name } = item;
//   return (
//     <ResourceItem
//       id={id}
//       url={''}
//       accessibilityLabel={`View details for ${name}`}
//     >
//       <InlineStack blockAlign="center" align="space-between">
//         <Text variant="bodyMd" fontWeight="bold" as="h3">
//           {name}
//         </Text>
//         <div
//           onClick={(e) => {
//             e.stopPropagation();
//           }}
//         >
//           <Button
//             icon={XIcon}
//             onClick={() => {
//               handleSelectPriceListId(id);
//             }}
//           />
//         </div>
//       </InlineStack>
//     </ResourceItem>
//   );
// }}
// />
