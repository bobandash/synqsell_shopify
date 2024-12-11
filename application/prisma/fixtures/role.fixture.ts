import { simpleFaker } from '@faker-js/faker';
import type { RolesOptions } from '~/constants';

export const sampleRole = (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
) => ({
  id: simpleFaker.string.uuid(),
  name,
  sessionId,
  createdAt: simpleFaker.date.recent(),
  isVisibleInNetwork,
});
