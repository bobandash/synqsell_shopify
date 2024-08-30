import { type ShopifyGlobal } from '@shopify/app-bridge-react';
import { MODALS } from '../constants';
import { type NavigateFunction } from '@remix-run/react';
import { CHECKLIST_ITEM_KEYS } from '~/constants';

type BtnAction = null | (() => void);

function getChecklistBtnFunction(
  key: string,
  shopify: ShopifyGlobal,
  navigate: NavigateFunction,
) {
  let btnFunction: BtnAction = null;
  switch (key) {
    // retailer actions
    case CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED:
      btnFunction = () => openModal(shopify, MODALS.BECOME_RETAILER);
      break;
    case CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE:
      btnFunction = () => navigate('/app/settings');
      break;
    case CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP:
      btnFunction = () => navigate('/app/supplier-network');
      break;
    case CHECKLIST_ITEM_KEYS.RETAILER_IMPORT_PRODUCT:
      btnFunction = () => navigate('/app/products');
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED:
      btnFunction = () => openModal(shopify, MODALS.BECOME_SUPPLIER);
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE:
      btnFunction = () => navigate('/app/settings');
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST:
      btnFunction = () => navigate('/app/price-list');
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_EXPLORE_NETWORK:
      btnFunction = () => navigate('/app/retailer-network');
      break;
  }

  return btnFunction;
}

function openModal(shopify: ShopifyGlobal, modal: string) {
  shopify.modal.show(modal);
}

export default getChecklistBtnFunction;
