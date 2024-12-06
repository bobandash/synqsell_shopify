import { ROLES } from '~/constants';
import { addRole } from '~/services/models/roles.server';
import { hasSession } from '~/services/models/session.server';
import { createChecklistTables } from './helper';
import db from '~/db.server';

// npx prisma db push
// npx prisma db seed - to run seed for database

async function main() {
  // create checklist tables
  const checklistTables = await db.checklistTable.findMany();
  const adminSessionExists = await hasSession(
    process.env.ADMIN_SESSION_ID ?? '',
  );
  const hasAdmin = await db.role.findFirst({
    where: {
      name: ROLES.ADMIN,
    },
  });
  if (adminSessionExists && !hasAdmin && process.env.ADMIN_SESSION_ID) {
    addRole(process.env.ADMIN_SESSION_ID, ROLES.ADMIN);
  }

  if (checklistTables.length === 0) {
    await createChecklistTables();
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
