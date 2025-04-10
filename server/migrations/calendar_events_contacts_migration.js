/**
 * Migration to update calendar_events schema to support multiple contacts per event
 * This migration:
 * 1. Creates a new event_contacts junction table
 * 2. Copies existing contact relationships to the new table
 * 3. Removes the contact_id column from calendar_events
 */
const { sql } = require('drizzle-orm');

module.exports = async (db) => {
  // 1. Create the new event_contacts junction table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_contacts (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Copy existing contact relationships to the new table
  await db.execute(sql`
    INSERT INTO event_contacts (event_id, contact_id)
    SELECT id, contact_id FROM calendar_events
    WHERE contact_id IS NOT NULL;
  `);

  // 3. Create indexes for the junction table
  await db.execute(sql`
    CREATE INDEX idx_event_contacts_event_id ON event_contacts (event_id);
  `);
  
  await db.execute(sql`
    CREATE INDEX idx_event_contacts_contact_id ON event_contacts (contact_id);
  `);

  // 4. Add a unique constraint to prevent duplicates
  await db.execute(sql`
    CREATE UNIQUE INDEX idx_event_contacts_unique ON event_contacts (event_id, contact_id);
  `);

  // 5. Remove the contact_id column from calendar_events
  await db.execute(sql`
    ALTER TABLE calendar_events DROP COLUMN IF EXISTS contact_id;
  `);

  console.log('✅ Successfully updated calendar_events schema to support multiple contacts per event');
}; 