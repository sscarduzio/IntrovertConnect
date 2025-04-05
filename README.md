# IntroConnect: Relationship Management for Introverts

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

IntroConnect is a sophisticated contact management platform specifically designed for introverts to help maintain relationships with minimal social anxiety. It provides intelligent reminders, relationship health tracking, and advanced organization tools to make staying in touch less overwhelming.

![IntroConnect Dashboard](attached_assets/image_1743798024901.png)

## 🌟 Features

- **Relationship-Focused Contact Management**: Track not just contact details but entire relationship histories
- **Smart Reminders**: Get timely notifications when it's time to reconnect with friends
- **Tag-Based Organization**: Group contacts by interests, communication preferences, and relationship types
- **Relationship Health Metrics**: Monitor engagement patterns with contact frequency trends and relationship scores
- **Calendar Integration**: Schedule and track meetups with convenient calendar views
- **Email Notifications**: Receive reminders via email to ensure you never forget to reconnect
- **Multi-User Support**: Secure authentication system to keep your relationship data private

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/introconnect

# Session
SESSION_SECRET=your_session_secret_here

# Email (optional)
SENDGRID_API_KEY=your_sendgrid_api_key
```

## 📊 Database Schema

IntroConnect uses a relational database with the following core tables:

| Table            | Description                                      |
|------------------|--------------------------------------------------|
| users            | User accounts with authentication credentials    |
| contacts         | Contact details with relationship metrics        |
| tags             | Categories for organizing contacts               |
| contact_tags     | Junction table for contact-tag relationships     |
| contact_logs     | Record of interactions with contacts             |
| calendar_events  | Events and meetups scheduled with contacts       |

## 📝 Usage

1. **Register/Login**: Create an account to access the system
2. **Add Contacts**: Enter contact details and set reminder frequencies
3. **Organize with Tags**: Create custom tags to categorize your contacts
4. **Log Interactions**: Record each meaningful interaction
5. **Schedule Events**: Create calendar events for future meetups
6. **Monitor Relationships**: Check the dashboard for relationship health metrics
7. **Receive Reminders**: Get email notifications when it's time to reconnect

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more information.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgements

- [FullCalendar](https://fullcalendar.io/) for the calendar interface
- [shadcn/ui](https://ui.shadcn.com/) for the UI components
- [TanStack Query](https://tanstack.com/query/latest) for data fetching
- [Drizzle ORM](https://orm.drizzle.team/) for database interactions
- [Replit](https://replit.com/) for development environment