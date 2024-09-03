import { IndexTable, Text } from '@shopify/polaris';
import type { FC } from 'react';
import type { RowData } from '../types';
import { convertToDate } from '~/routes/util';
import StatusBadge from './StatusBadge';
import { v4 as uuidv4 } from 'uuid';

type RowMarkupProps = {
  data: RowData;
  index: number;
  selected: boolean;
};

const TableRow: FC<RowMarkupProps> = ({ data, index, selected }) => {
  const { id, requestDate, name, websiteUrl, priceLists, status, updatedAt } =
    data;

  return (
    <IndexTable.Row id={id} key={id} selected={selected} position={index}>
      <IndexTable.Cell>{convertToDate(requestDate)}</IndexTable.Cell>
      <IndexTable.Cell>{name}</IndexTable.Cell>
      <IndexTable.Cell>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Link
        </a>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {priceLists.map((priceList) => (
          <Text as="p" variant="bodyMd" key={uuidv4()}>
            {priceList}
          </Text>
        ))}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <StatusBadge status={status} />
      </IndexTable.Cell>
      <IndexTable.Cell>{convertToDate(updatedAt)}</IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default TableRow;
