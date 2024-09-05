import { array, string } from 'yup';

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

export const createIdListSchema = (
  model: string,
  validateFunction: (value: string) => Promise<boolean>,
) =>
  array()
    .of(string().required())
    .required()
    .test(
      `is-valid-${model}-ids`,
      `${model} ids have to be valid`,
      async (ids) => {
        const isValidArr = await Promise.all(
          ids.map((id) => validateFunction(id)),
        );
        const isAllIdsValid =
          isValidArr.filter((valid) => valid === false).length === 0;
        return isAllIdsValid;
      },
    );
