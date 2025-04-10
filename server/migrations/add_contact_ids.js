/**
 * Migration to add the contactIds column to the calendar_events table
 * Run this file manually using: node server/migrations/add_contact_ids.js
 */

// Load environment variables
require('dotenv').config();

// PostgreSQL client
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: 'localhost',
          port: 5432,
          database: 'introconnect',
          user: 'postgres',
          password: 'postgres',
        }
  );

  try {
    // Start a transaction
    await pool.query('BEGIN');
    console.log('Starting migration...');

    // Add the contactIds column
    await pool.query(`
      ALTER TABLE calendar_events 
      ADD COLUMN IF NOT EXISTS contact_ids TEXT DEFAULT '[]';
    `);
    console.log('Added contact_ids column');

    // Initialize contact_ids with existing contactId for each row
    await pool.query(`
      UPDATE calendar_events
      SET contact_ids = CONCAT('["', contact_id::text, '"]')
      WHERE contact_ids = '[]' AND contact_id IS NOT NULL;
    `);
    console.log('Initialized contact_ids with existing contactId values');

    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 