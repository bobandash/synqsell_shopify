import { string } from 'yup';

export const createIdSchema = (
  model: string,
  validateFunction: (value: string) => Promise<boolean>,
) =>
  string()
    .required()
    .test(
      `is-valid-${model}-id`,
      `${model} id does not exist`,
      async (value) => {
        return await validateFunction(value);
      },
    );
