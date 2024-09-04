import type { FC } from 'react';
import type { PriceListTableInfoProps } from '../types';
import { useLocation, useNavigate } from '@remix-run/react';
import { convertToTitleCase } from '~/routes/util';
import { Badge, IndexTable, Text } from '@shopify/polaris';

type RowProps = {
  data: PriceListTableInfoProps;
  index: number;
  selected: boolean;
};

const TableRow: FC<RowProps> = ({ data, index, selected }) => {
  const {
    id,
    name,
    isGeneral,
    pricingStrategy,
    numProducts,
    numRetailers,
    sales,
    margin,
  } = data;

  const navigate = useNavigate();
  const location = useLocation();
  function navigateToPriceList() {
    navigate(`${location.pathname}/${id}`);
  }

  const marginText = margin
    ? `${convertToTitleCase(pricingStrategy)} (${margin}%)`
    : convertToTitleCase(pricingStrategy);

  return (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selected}
      position={index}
      onClick={navigateToPriceList}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {isGeneral ? (
          <Badge tone="success">General</Badge>
        ) : (
          <Badge tone="info">Private</Badge>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>{numProducts}</IndexTable.Cell>
      <IndexTable.Cell>{numRetailers}</IndexTable.Cell>
      <IndexTable.Cell>{sales}</IndexTable.Cell>
      <IndexTable.Cell>{marginText}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default TableRow;
