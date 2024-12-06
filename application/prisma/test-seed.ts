import { createChecklistTables } from './helper';
import db from '~/db.server';
async function createTestData() {
  await Promise.all([createChecklistTables()]);
}

async function clearDatabase() {
  await db.$executeRaw`
      DO
      $func$
      BEGIN
        EXECUTE (
          SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(table_name), ', ') || ' RESTART IDENTITY CASCADE'
          FROM   information_schema.tables
          WHERE  table_schema = 'public'
          AND    table_type = 'BASE TABLE'
        );
      END
      $func$;
    `;
}

export { createTestData, clearDatabase };
