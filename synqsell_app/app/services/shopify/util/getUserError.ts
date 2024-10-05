import createHttpError from 'http-errors';
import logger from '~/logger';
import type { UserError } from '~/types/admin.types';

type Data = Record<string, any>;

type GetUserError = {
  defaultMessage: string;
  userErrors?: UserError[];
  parentFunc: (...args: any[]) => any;
  data?: Data;
};

function getUserError({
  defaultMessage,
  userErrors,
  parentFunc,
  data,
}: GetUserError) {
  let errorMessage = '';
  if (userErrors && userErrors.length > 0) {
    errorMessage = userErrors.map((error) => error.message).join(' ');
  } else {
    errorMessage = defaultMessage;
  }
  logger.error(`Shopify GraphQL Error: ${errorMessage}`, {
    parentFunc,
    ...data,
  });
  return new createHttpError.BadRequest(errorMessage);
}

export default getUserError;
