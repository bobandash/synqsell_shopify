import { IndexTable, Link, Text } from '@shopify/polaris';
import type { FC } from 'react';
import type { RowData } from '../types';
import { convertToDate } from '~/routes/util';
import StatusBadge from './StatusBadge';

type RowMarkupProps = {
  data: RowData;
  index: number;
  selected: boolean;
};

const TableRow: FC<RowMarkupProps> = ({ data, index, selected }) => {
  const { id, createdAt, name, websiteUrl, priceLists, status } = data;

  return (
    <IndexTable.Row id={id} key={id} selected={selected} position={index}>
      <IndexTable.Cell>{convertToDate(createdAt)}</IndexTable.Cell>
      <IndexTable.Cell>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {name}
        </a>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {priceLists.map((priceList) => (
          <Text as="p" variant="bodyMd" key={priceList.id}>
            <Link url={`/app/products/${priceList.id}`}>{priceList.name}</Link>
          </Text>
        ))}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <StatusBadge status={status} />
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default TableRow;
