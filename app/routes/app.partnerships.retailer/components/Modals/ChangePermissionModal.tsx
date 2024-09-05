import { Modal, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { type FC, useCallback, useMemo } from 'react';
import { MODALS } from '../../constants';
import type { PriceListJSON } from '../../types';
import { ChoiceList } from '@shopify/polaris';
import sharedStyles from '~/shared.module.css';
type Props = {
  priceLists: PriceListJSON[];
  setSelectedPriceListIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPriceListIds: string[];
  changeRetailerPermissionsSubmit: (event?: React.FormEvent) => Promise<void>;
};

const ChangePermissionModal: FC<Props> = ({
  priceLists,
  setSelectedPriceListIds,
  selectedPriceListIds,
  changeRetailerPermissionsSubmit,
}) => {
  const shopify = useAppBridge();
  const hideModal = useCallback(() => {
    shopify.modal.hide(MODALS.CHANGE_PERMISSION);
  }, [shopify]);

  const choices = useMemo(() => {
    return priceLists.map(({ name, id }) => ({
      label: name,
      value: id,
    }));
  }, [priceLists]);

  const handleChange = useCallback(
    (priceListIds: string[]) => {
      setSelectedPriceListIds(priceListIds);
    },
    [setSelectedPriceListIds],
  );

  return (
    <Modal id={MODALS.CHANGE_PERMISSION}>
      <p style={{ paddingBottom: '0.25rem', fontWeight: 'bold' }}></p>
      <div
        style={{ padding: '1rem' }}
        className={sharedStyles['choice-list-container']}
      >
        <ChoiceList
          allowMultiple
          title="Price Lists To Give Permission:"
          choices={choices}
          selected={selectedPriceListIds}
          onChange={handleChange}
        />
      </div>

      <TitleBar title={`Change permissions for selected price lists`}>
        <button variant="primary" onClick={changeRetailerPermissionsSubmit}>
          Change Permissions
        </button>
        <button onClick={hideModal}>Close</button>
      </TitleBar>
    </Modal>
  );
};

export default ChangePermissionModal;
