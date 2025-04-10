
// Load environment variables
import 'dotenv/config';
import { db } from './server/db.js';
import migration from './server/migrations/calendar_events_contacts_migration.js';

async function runMigration() {
  try {
    console.log('Starting migration...');
    await migration(db);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
