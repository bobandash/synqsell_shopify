import db from '~/db.server';
import { object, string } from 'yup';
import { ROLES } from '~/constants';
import { isValidChecklistStatusId } from '../models/checklistStatus';
import { errorHandler } from '../util';

const roleSchema = object({
  role: string()
    .oneOf(Array.from(Object.values(ROLES)))
    .required(),
  checklistStatusId: string()
    .required()
    .test(
      'checklist-status-id-validation',
      'Checklist status must be in database.',
      async (checklistStatusId) => {
        const checklistStatusExists =
          await isValidChecklistStatusId(checklistStatusId);
        if (!checklistStatusExists) {
          return false;
        }
        return true;
      },
    ),
  sessionId: string().required(),
});

async function createRoleAndCompleteChecklistItem(
  sessionId: string,
  role: string,
  checklistStatusId: string,
) {
  try {
    await roleSchema.validate({ sessionId, role, checklistStatusId });
    const [newRole, newChecklistStatus] = await db.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: role,
          sessionId,
        },
      });
      const newChecklistStatus = await tx.checklistStatus.update({
        where: {
          id: checklistStatusId,
        },
        data: {
          isCompleted: true,
        },
      });
      return [newRole, newChecklistStatus];
    });

    return {
      role: newRole,
      checklistStatus: newChecklistStatus,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create role and complete checklist status.',
      createRoleAndCompleteChecklistItem,
      { sessionId, role, checklistStatusId },
    );
  }
}

export default createRoleAndCompleteChecklistItem;
