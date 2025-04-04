import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, AlertCircle, UserRound, PlusCircle, Calendar } from "lucide-react";
import { AddContactModal } from "@/components/add-contact-modal";
import { ContactDetailsModal } from "@/components/contact-details-modal";
import { MarkContactedModal } from "@/components/mark-contacted-modal";
import Navbar from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ContactWithTags, ContactWithLogsAndTags, CalendarEvent } from "@shared/schema";

type DashboardData = {
  stats: {
    totalContacts: number;
    dueContacts: number;
    topTag: { name: string; count: number } | null;
  };
  dueContacts: ContactWithTags[];
  recentContacts: ContactWithTags[];
  upcomingEvents: CalendarEvent[];
  popularTags: { id: number; name: string; count: number }[];
};

export default function DashboardPage() {
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isContactDetailsModalOpen, setIsContactDetailsModalOpen] = useState(false);
  const [isMarkContactedModalOpen, setIsMarkContactedModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactWithLogsAndTags | null>(null);

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
              <h2 className="text-lg font-semibold">Error loading dashboard</h2>
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
          {/* Dashboard Header */}
          <div className="pb-5 border-b border-gray-200 mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <Button onClick={() => setIsAddContactModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>

          {/* Dashboard Overview Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {/* Total Contacts Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Contacts</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{data?.stats.totalContacts || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Due for Follow-up Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Due for Follow-up</dt>
                      <dd className="text-3xl font-semibold text-gray-900">{data?.stats.dueContacts || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Most Active Tag Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Most Active Tag</dt>
                      <dd>
                        {data?.stats.topTag ? (
                          <>
                            <span className="text-lg font-semibold text-gray-900">{data.stats.topTag.name}</span>
                            <span className="ml-1 text-sm text-gray-500">({data.stats.topTag.count})</span>
                          </>
                        ) : (
                          <span className="text-lg text-gray-400">No tags yet</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Reminders Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900">Follow-up Reminders</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Contacts you should reconnect with soon</p>
              </div>
              <Link href="/reminders" className="text-sm text-primary font-medium flex items-center">
                View all 
                <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            </div>
            {data?.dueContacts && data.dueContacts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {data.dueContacts.slice(0, 3).map((contact) => {
                  const dueStatus = contact.nextContactDate 
                    ? getDueStatus(new Date(contact.nextContactDate)) 
                    : "Unknown";
                  const lastContactText = contact.lastContactDate 
                    ? getLastContactText(new Date(contact.lastContactDate)) 
                    : "Never contacted";

                  return (
                    <li key={contact.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                            <span className="font-medium">{getInitials(`${contact.firstName} ${contact.lastName}`)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h3 className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</h3>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDueStatusClass(dueStatus)}`}>
                                {dueStatus}
                              </span>
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="text-sm text-gray-500 mr-2">Last contact: {lastContactText}</span>
                              {contact.tags.map((tag) => (
                                <span key={tag.id} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mr-1">
                                  {tag.name}
                                </span>
                              ))}
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
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <p>No contacts due for follow-up. You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Recent Contacts & Tag Browser */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
            {/* Recent Contacts (3 columns) */}
            <div className="sm:col-span-3 bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Contacts</h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">People you've recently added or updated</p>
                </div>
                <Link href="/contacts" className="text-sm text-primary font-medium flex items-center">
                  View all 
                  <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Link>
              </div>
              
              {data?.recentContacts && data.recentContacts.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {data.recentContacts.slice(0, 3).map((contact) => {
                    const updatedText = getLastUpdateText(new Date(contact.updatedAt));
                    
                    return (
                      <li key={contact.id}>
                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
                                <span className="font-medium">{getInitials(`${contact.firstName} ${contact.lastName}`)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{contact.firstName} {contact.lastName}</div>
                                <div className="text-sm text-gray-500">{contact.createdAt === contact.updatedAt ? `Added ${updatedText}` : `Updated ${updatedText}`}</div>
                              </div>
                            </div>
                            <div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenContactDetails(contact.id)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-gray-500">
                  <p>No contacts added yet. Add your first contact to get started!</p>
                </div>
              )}
            </div>

            {/* Tags Browser (2 columns) */}
            <div className="sm:col-span-2 bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Browse by Interest</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Find contacts by shared interests</p>
                <div className="mt-4">
                  <Input type="text" placeholder="Search tags..." />
                </div>
              </div>
              <div className="px-4 pb-5 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  {data?.popularTags && data.popularTags.length > 0 ? (
                    data.popularTags.map((tag) => (
                      <Link 
                        key={tag.id} 
                        href={`/tags?tag=${tag.name}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        {tag.name} ({tag.count})
                      </Link>
                    ))
                  ) : (
                    <div className="py-2 text-gray-500">
                      <p>No tags created yet.</p>
                    </div>
                  )}
                  <Link 
                    href="/tags"
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Tag
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900">Upcoming Events</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Your scheduled meetups and events</p>
              </div>
              <Link href="/events" className="text-sm text-primary font-medium flex items-center">
                View all 
                <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            </div>
            {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {data.upcomingEvents.slice(0, 3).map((event) => {
                  const eventDate = new Date(event.startDate);
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  }).format(eventDate);
                  
                  return (
                    <li key={event.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{event.title}</div>
                              <div className="text-sm text-gray-500">
                                {formattedDate} {event.location ? `• ${event.location}` : ''}
                              </div>
                              {event.description && (
                                <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <Link href={`/events/${event.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <p>No upcoming events. Schedule a meetup with a contact!</p>
              </div>
            )}
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
      <AddContactModal 
        isOpen={isAddContactModalOpen} 
        onClose={() => setIsAddContactModalOpen(false)}
      />
      
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

function getLastUpdateText(date: Date): string {
  return getLastContactText(date);
}
