import { ContactWithTags } from "@shared/schema";
import { storage } from "./storage";

// In a real application, we would use nodemailer or similar to send emails
// For this MVP, we'll just log the reminders to the console
export async function sendReminderEmail(contact: ContactWithTags, userEmail: string): Promise<void> {
  const name = `${contact.firstName} ${contact.lastName}`;
  const subject = `Reminder: Time to reconnect with ${name}`;
  const tagsList = contact.tags.map(tag => tag.name).join(", ");
  
  const body = `
Hi there,

It's time to reconnect with ${name}. 
${contact.lastContactDate ? `You last contacted them on ${contact.lastContactDate.toLocaleDateString()}.` : "You haven't contacted them yet."}

Their interests include: ${tagsList || "No interests listed yet"}

${contact.notes ? `Notes: ${contact.notes}` : ""}

Best,
Your IntrovertConnect Assistant
  `;
  
  console.log(`EMAIL REMINDER to ${userEmail}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("----------------------------");
}

// This would typically be run by a cron job or scheduler
// For this MVP, we'll expose it as an API endpoint
export async function processReminders(): Promise<void> {
  try {
    const today = new Date();
    const allUsers = Array.from(storage["users"].values());
    
    for (const user of allUsers) {
      // Get all contacts with reminders due
      const contacts = await storage.getDueContacts(user.id);
      
      // Send reminder email for each contact
      for (const contact of contacts) {
        await sendReminderEmail(contact, user.email);
      }
    }
  } catch (error) {
    console.error("Error processing reminders:", error);
  }
}
