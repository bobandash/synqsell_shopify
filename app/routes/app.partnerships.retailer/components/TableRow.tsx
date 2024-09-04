import { Button, IndexTable, Link } from '@shopify/polaris';
import { useCallback, type FC } from 'react';
import type { RowData } from '../types';
import { convertToDate } from '~/routes/util';
import StatusBadge from './StatusBadge';
import { useAppBridge } from '@shopify/app-bridge-react';
import { MODALS } from '../constants';
import sharedStyles from '~/shared.module.css';
type RowMarkupProps = {
  data: RowData;
  index: number;
  selected: boolean;
  setMessage: React.Dispatch<
    React.SetStateAction<{
      name: string;
      content: string;
    }>
  >;
};

const TableRow: FC<RowMarkupProps> = ({
  data,
  index,
  selected,
  setMessage,
}) => {
  const { id, createdAt, name, websiteUrl, priceLists, status, message } = data;
  const shopify = useAppBridge();

  const handleClick = useCallback(() => {
    setMessage({
      name,
      content: message,
    });
    shopify.modal.show(MODALS.MESSAGE);
  }, [message, setMessage, shopify, name]);

  const handleStopPropagation = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <IndexTable.Row id={id} key={id} selected={selected} position={index}>
      <IndexTable.Cell>{convertToDate(createdAt)}</IndexTable.Cell>
      <IndexTable.Cell>
        <div
          onClick={handleStopPropagation}
          className={sharedStyles['inline-block']}
        >
          <Link url={websiteUrl} target="_blank">
            {name}
          </Link>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {priceLists.map((priceList) => (
          <div
            onClick={handleStopPropagation}
            key={priceList.id}
            className={sharedStyles['inline-block']}
          >
            <Link url={`/app/products/${priceList.id}`}>{priceList.name}</Link>
          </div>
        ))}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div
          onClick={handleStopPropagation}
          className={sharedStyles['inline-block']}
        >
          <Button onClick={handleClick}>Open</Button>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <StatusBadge status={status} />
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

export default TableRow;
