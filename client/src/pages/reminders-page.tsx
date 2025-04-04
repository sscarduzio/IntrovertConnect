import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import Navbar from "@/components/navbar";
import { ContactDetailsModal } from "@/components/contact-details-modal";
import { MarkContactedModal } from "@/components/mark-contacted-modal";
import { ContactWithTags, ContactWithLogsAndTags } from "@shared/schema";

type DashboardData = {
  dueContacts: ContactWithTags[];
};

export default function RemindersPage() {
  const [isContactDetailsModalOpen, setIsContactDetailsModalOpen] = useState(false);
  const [isMarkContactedModalOpen, setIsMarkContactedModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactWithLogsAndTags | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>("all");

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const handleOpenContactDetails = async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contact details");
      const contact = await response.json();
      setSelectedContact(contact);
      setIsContactDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching contact details:", error);
    }
  };

  const handleMarkContacted = (contact: ContactWithLogsAndTags) => {
    setSelectedContact(contact);
    setIsContactDetailsModalOpen(false);
    setIsMarkContactedModalOpen(true);
  };

  const filterContactsByPeriod = (contacts: ContactWithTags[] | undefined) => {
    if (!contacts) return [];
    
    const now = new Date();
    
    switch(timePeriod) {
      case "overdue":
        return contacts.filter(c => 
          c.nextContactDate && new Date(c.nextContactDate) < now
        );
      case "today":
        return contacts.filter(c => {
          if (!c.nextContactDate) return false;
          const nextDate = new Date(c.nextContactDate);
          return nextDate.toDateString() === now.toDateString();
        });
      case "thisWeek":
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);
        return contacts.filter(c => {
          if (!c.nextContactDate) return false;
          const nextDate = new Date(c.nextContactDate);
          return nextDate >= now && nextDate <= weekFromNow;
        });
      case "thisMonth":
        const monthFromNow = new Date();
        monthFromNow.setMonth(now.getMonth() + 1);
        return contacts.filter(c => {
          if (!c.nextContactDate) return false;
          const nextDate = new Date(c.nextContactDate);
          return nextDate >= now && nextDate <= monthFromNow;
        });
      case "all":
      default:
        return contacts;
    }
  };
  
  const filteredContacts = filterContactsByPeriod(data?.dueContacts);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">Error loading reminders</h2>
            </div>
            <p className="text-sm text-gray-600">{error.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="pb-5 border-b border-gray-200 mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Follow-up Reminders</h1>
            <div className="flex items-center">
              <Filter className="mr-2 h-4 w-4 text-gray-500" />
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reminders</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="today">Due Today</SelectItem>
                  <SelectItem value="thisWeek">Due This Week</SelectItem>
                  <SelectItem value="thisMonth">Due This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reminders List */}
          {filteredContacts.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => {
                  const dueStatus = contact.nextContactDate 
                    ? getDueStatus(new Date(contact.nextContactDate)) 
                    : "Unknown";
                  const lastContactText = contact.lastContactDate 
                    ? getLastContactText(new Date(contact.lastContactDate)) 
                    : "Never contacted";

                  return (
                    <li key={contact.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center mb-4 sm:mb-0">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                            <span className="font-medium">{getInitials(`${contact.firstName} ${contact.lastName}`)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center flex-wrap gap-2">
                              <h3 className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</h3>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDueStatusClass(dueStatus)}`}>
                                {dueStatus}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center mt-1 gap-2 sm:gap-4">
                              <span className="text-sm text-gray-500">Last contact: {lastContactText}</span>
                              <div className="flex flex-wrap gap-1">
                                {contact.tags.map((tag) => (
                                  <span key={tag.id} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleOpenContactDetails(contact.id)}
                          >
                            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Mark Contacted
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenContactDetails(contact.id)}
                          >
                            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white shadow sm:rounded-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No follow-up reminders</h3>
              <p className="mt-1 text-gray-500">
                {timePeriod === "all" 
                  ? "You don't have any contacts due for follow-up." 
                  : "No contacts found matching the selected filter."}
              </p>
              {timePeriod !== "all" && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setTimePeriod("all")}
                >
                  View all reminders
                </Button>
              )}
            </div>
          )}

          {/* Reminder Tip */}
          <div className="mt-6 bg-blue-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">About Follow-up Reminders</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    When you mark a contact as "contacted," their next reminder will be automatically scheduled based on their reminder frequency. You can adjust this frequency in their contact details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} IntrovertConnect. All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* Modals */}
      {selectedContact && (
        <>
          <ContactDetailsModal 
            isOpen={isContactDetailsModalOpen}
            onClose={() => setIsContactDetailsModalOpen(false)}
            contact={selectedContact}
            onMarkContacted={() => handleMarkContacted(selectedContact)}
          />
          
          <MarkContactedModal 
            isOpen={isMarkContactedModalOpen}
            onClose={() => setIsMarkContactedModalOpen(false)}
            contact={selectedContact}
          />
        </>
      )}
    </div>
  );
}

// Utility functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

function getDueStatus(dueDate: Date): string {
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `Due ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else {
    return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
}

function getDueStatusClass(status: string): string {
  if (status.includes('ago')) {
    return 'bg-yellow-100 text-yellow-800';
  } else if (status === 'Due today') {
    return 'bg-orange-100 text-orange-800';
  } else {
    return 'bg-blue-100 text-blue-800';
  }
}

function getLastContactText(date: Date): string {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}
