import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Loader2, AlertCircle, Calendar, PlusCircle, Clock, MapPin } from "lucide-react";
import Navbar from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarEvent, ContactWithTags } from "@shared/schema";

type EventsData = CalendarEvent[];

export default function EventsPage() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = useQuery<EventsData>({
    queryKey: ["/api/events"],
  });

  const [upcomingSelected, setUpcomingSelected] = useState(true);

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
              <h2 className="text-lg font-semibold">Error loading events</h2>
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

  // Filter and sort events
  const now = new Date();
  let filteredEvents = data ? [...data] : [];
  
  if (upcomingSelected) {
    filteredEvents = filteredEvents.filter(event => new Date(event.startDate) >= now);
    filteredEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  } else {
    filteredEvents = filteredEvents.filter(event => new Date(event.startDate) < now);
    filteredEvents.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Events Header */}
          <div className="pb-5 border-b border-gray-200 mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Calendar Events</h1>
            <Link href="/contacts">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </div>

          {/* Events Filter */}
          <div className="flex space-x-2 mb-6">
            <Button 
              variant={upcomingSelected ? "default" : "outline"} 
              onClick={() => setUpcomingSelected(true)}
            >
              Upcoming Events
            </Button>
            <Button 
              variant={!upcomingSelected ? "default" : "outline"} 
              onClick={() => setUpcomingSelected(false)}
            >
              Past Events
            </Button>
          </div>

          {/* Events List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {filteredEvents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredEvents.map((event) => {
                  // Format the event date for display
                  const eventDate = new Date(event.startDate);
                  const endDate = new Date(event.endDate);
                  
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  }).format(eventDate);
                  
                  const formattedStartTime = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }).format(eventDate);
                  
                  const formattedEndTime = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }).format(endDate);
                  
                  // Check if the event is happening today
                  const isToday = new Date(eventDate).toDateString() === new Date().toDateString();
                  
                  // Calculate if it's upcoming or in progress
                  const isInProgress = now >= eventDate && now <= endDate;
                  
                  return (
                    <li key={event.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Calendar className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                                {isToday && !isInProgress && (
                                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Today
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    In Progress
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center mt-1">
                                <Clock className="h-4 w-4 mr-1" />
                                {formattedDate}, {formattedStartTime} - {formattedEndTime}
                              </div>
                              {event.location && (
                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {event.location}
                                </div>
                              )}
                              {event.description && (
                                <div className="text-sm text-gray-500 mt-1 max-w-lg overflow-hidden overflow-ellipsis">
                                  {event.description.length > 100 
                                    ? `${event.description.substring(0, 100)}...` 
                                    : event.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}`)}
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
                <p>{upcomingSelected ? "No upcoming events scheduled." : "No past events found."}</p>
                <Button variant="link" className="mt-2">
                  <Link href="/events/new">Create New Event</Link>
                </Button>
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
    </div>
  );
}