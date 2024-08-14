import { type ShopifyGlobal } from "@shopify/app-bridge-react";
import { MODALS } from "../constants";
import { type NavigateFunction } from "@remix-run/react";
import { CHECKLIST_ITEM_KEYS } from "~/constants";

type BtnAction = null | (() => void);

function getChecklistBtnFunction(
  key: string,
  shopify: ShopifyGlobal,
  navigate: NavigateFunction,
) {
  let btnFunction: BtnAction = null;
  switch (key) {
    case CHECKLIST_ITEM_KEYS.RETAILER_GET_STARTED:
      btnFunction = () => openModal(shopify, MODALS.BECOME_RETAILER);
      break;
    case CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE:
      btnFunction = () => navigate("/app/settings");
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_GET_STARTED:
      btnFunction = () => openModal(shopify, MODALS.BECOME_SUPPLIER);
      break;
    case CHECKLIST_ITEM_KEYS.SUPPLIER_CUSTOMIZE_PROFILE:
      btnFunction = () => navigate("/app/settings");
      break;
  }

  return btnFunction;
}

function openModal(shopify: ShopifyGlobal, modal: string) {
  shopify.modal.show(modal);
}

export default getChecklistBtnFunction;
