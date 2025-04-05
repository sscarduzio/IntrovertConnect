import { ContactWithTags, User, users } from "@shared/schema";
import { storage } from "./storage";
import sgMail from '@sendgrid/mail';
import { db } from "./db";

// Helper function to get all users from the database
async function getAllUsers(): Promise<User[]> {
  return await db.select().from(users);
}

// Set the SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY environment variable is not set");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendReminderEmail(contact: ContactWithTags, userEmail: string): Promise<void> {
  const name = `${contact.firstName} ${contact.lastName}`;
  const subject = `Reminder: Time to reconnect with ${name}`;
  const tagsList = contact.tags.map(tag => tag.name).join(", ");
  
  const htmlBody = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #4a6da7;">Time to reconnect with ${name}</h2>
    <p style="font-size: 16px; line-height: 1.5;">
      ${contact.lastContactDate ? 
        `You last contacted them on <strong>${new Date(contact.lastContactDate).toLocaleDateString()}</strong>.` : 
        "You haven't contacted them yet."}
    </p>
    
    <h3 style="color: #555;">Interests</h3>
    <p style="font-size: 16px;">${tagsList || "No interests listed yet"}</p>
    
    ${contact.notes ? 
      `<h3 style="color: #555;">Notes</h3>
      <p style="font-size: 16px; font-style: italic; background-color: #f9f9f9; padding: 10px; border-left: 4px solid #4a6da7;">${contact.notes}</p>` : 
      ""}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 14px; color: #777;">
        Best regards,<br>
        Your IntrovertConnect Assistant
      </p>
    </div>
  </div>
  `;
  
  const textBody = `
Hi there,

It's time to reconnect with ${name}. 
${contact.lastContactDate ? `You last contacted them on ${new Date(contact.lastContactDate).toLocaleDateString()}.` : "You haven't contacted them yet."}

Their interests include: ${tagsList || "No interests listed yet"}

${contact.notes ? `Notes: ${contact.notes}` : ""}

Best,
Your IntrovertConnect Assistant
  `;
  
  try {
    const msg = {
      to: userEmail,
      from: 'alerts@introvertconnect.com', // This should be replaced with your verified sender email
      subject: subject,
      text: textBody,
      html: htmlBody,
    };
    
    await sgMail.send(msg);
    console.log(`Email reminder sent to ${userEmail} for contact ${name}`);
  } catch (error) {
    console.error('Error sending email reminder:', error);
    
    // Log the email info for debugging
    console.log(`EMAIL REMINDER that would be sent to ${userEmail}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${textBody}`);
    console.log("----------------------------");
  }
}

// This would typically be run by a cron job or scheduler
// For this MVP, we'll expose it as an API endpoint
export async function processReminders(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for comparison
    
    // Get all users from the database
    const allUsers = await getAllUsers();
    let remindersProcessed = 0;
    
    for (const user of allUsers) {
      // Get all contacts with reminders
      const contacts = await storage.getDueContacts(user.id);
      
      // Filter contacts that are due today or overdue
      const dueContacts = contacts.filter(contact => {
        if (!contact.nextContactDate) return false;
        
        const nextContactDate = new Date(contact.nextContactDate);
        nextContactDate.setHours(0, 0, 0, 0); // Set to beginning of day for comparison
        
        // Check if the next contact date is today or in the past
        return nextContactDate <= today;
      });
      
      // Send reminder email for each due contact
      for (const contact of dueContacts) {
        await sendReminderEmail(contact, user.email);
        remindersProcessed++;
      }
    }
    
    console.log(`Reminder process complete. Processed ${remindersProcessed} reminders.`);
    return Promise.resolve();
  } catch (error) {
    console.error("Error processing reminders:", error);
    return Promise.reject(error);
  }
}

// Process reminders for a specific user
export async function processUserReminders(userId: number): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for comparison
    
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Get all contacts with reminders
    const contacts = await storage.getDueContacts(userId);
    
    // Filter contacts that are due today or overdue
    const dueContacts = contacts.filter(contact => {
      if (!contact.nextContactDate) return false;
      
      const nextContactDate = new Date(contact.nextContactDate);
      nextContactDate.setHours(0, 0, 0, 0); // Set to beginning of day for comparison
      
      // Check if the next contact date is today or in the past
      return nextContactDate <= today;
    });
    
    // Send reminder email for each due contact
    for (const contact of dueContacts) {
      await sendReminderEmail(contact, user.email);
    }
    
    console.log(`Processed ${dueContacts.length} reminders for user ${userId}`);
    return dueContacts.length;
  } catch (error) {
    console.error(`Error processing reminders for user ${userId}:`, error);
    return 0;
  }
}