import db from '~/db.server';
import { object, string } from 'yup';
import { ROLES } from '~/constants';
import { checklistStatusIdSchema, sessionIdSchema } from '~/schemas/models';

const roleSchema = object({
  role: string()
    .oneOf(Array.from(Object.values(ROLES)))
    .required(),
  checklistStatusId: checklistStatusIdSchema,
  sessionId: sessionIdSchema,
});

async function createRoleAndCompleteChecklistItem(
  sessionId: string,
  role: string,
  checklistStatusId: string,
) {
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
}

export default createRoleAndCompleteChecklistItem;
