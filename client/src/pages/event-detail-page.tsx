import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Info, 
  Edit, 
  Trash, 
  ChevronLeft,
  CheckCircle
} from "lucide-react";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarEvent, ContactWithTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function EventDetailPage() {
  const [, params] = useRoute('/events/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [markAttendedDialogOpen, setMarkAttendedDialogOpen] = useState(false);
  const [resetReminder, setResetReminder] = useState(true);
  
  const eventId = params?.id ? parseInt(params.id) : -1;

  // Fetch event details
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<CalendarEvent>({
    queryKey: ['/api/events', eventId],
    enabled: eventId > 0,
  });

  // Fetch contact details for this event
  const { data: contact, isLoading: contactLoading } = useQuery<ContactWithTags>({
    queryKey: ['/api/contacts', event?.contactId],
    enabled: !!event?.contactId,
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      navigate('/events');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteEventMutation.mutate();
    setDeleteDialogOpen(false);
  };
  
  // Mark event as attended mutation
  const markAttendedMutation = useMutation({
    mutationFn: async () => {
      if (!event || !contact) {
        throw new Error("Event or contact data not available");
      }
      
      const contactLogData = {
        contactDate: format(startDate, "yyyy-MM-dd"),
        contactType: "event",
        notes: `Attended event: ${event.title}`,
        resetReminder: resetReminder,
      };
      
      const res = await apiRequest("POST", `/api/contacts/${contact.id}/logs`, contactLogData);
      return await res.json();
    },
    onSuccess: () => {
      if (!contact) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Event marked as attended",
        description: resetReminder 
          ? `Contact with ${contact.firstName} has been logged and reminder has been reset.`
          : `Contact with ${contact.firstName} has been logged without changing the reminder schedule.`,
      });
      
      setMarkAttendedDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark event as attended",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const markEventAttended = () => {
    markAttendedMutation.mutate();
  };

  // Loading state
  if (eventLoading || contactLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (eventError || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">Error loading event</h2>
            </div>
            <p className="text-sm text-gray-600">
              {eventError ? eventError.message : "Event not found"}
            </p>
            <Button className="mt-4" onClick={() => navigate('/events')}>
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format dates
  // Make sure we have valid dates before formatting
  const startDateStr = event.startDate?.toString();
  const endDateStr = event.endDate?.toString();
  
  // Create dates only if we have valid strings
  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  
  // Check if the dates are valid before formatting
  const isStartDateValid = !isNaN(startDate.getTime());
  const isEndDateValid = !isNaN(endDate.getTime());
  
  const formattedDate = isStartDateValid ? new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  }).format(startDate) : "Invalid date";
  
  const formattedStartTime = isStartDateValid ? new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(startDate) : "Invalid time";
  
  const formattedEndTime = isEndDateValid ? new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(endDate) : "Invalid time";

  // Calculate status
  const now = new Date();
  const isInProgress = now >= startDate && now <= endDate;
  const isPast = now > endDate;
  const isUpcoming = now < startDate;

  let statusBadgeClass = "text-blue-800 bg-blue-100";
  let statusText = "Upcoming";
  
  if (isInProgress) {
    statusBadgeClass = "text-green-800 bg-green-100";
    statusText = "In Progress";
  } else if (isPast) {
    statusBadgeClass = "text-gray-800 bg-gray-100";
    statusText = "Past";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button */}
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate('/events')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center mr-4">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                    <CardDescription>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass}`}>
                        {statusText}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteClick}>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Date and Time</h3>
                    <p className="text-gray-700">{formattedDate}</p>
                    <p className="text-gray-700">{formattedStartTime} - {formattedEndTime}</p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start space-x-4">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p className="text-gray-700">{event.location}</p>
                    </div>
                  </div>
                )}

                {contact && (
                  <div className="flex items-start space-x-4">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Contact</h3>
                      <p className="text-gray-700">
                        <Link href={`/contacts/${contact.id}`}>
                          <span className="text-primary hover:underline cursor-pointer">
                            {`${contact.firstName} ${contact.lastName}`}
                          </span>
                        </Link>
                      </p>
                      
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.tags.map(tag => (
                            <span 
                              key={tag.id} 
                              className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event.description && (
                  <div className="flex items-start space-x-4">
                    <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
                    </div>
                  </div>
                )}

                {event.reminderMinutes !== null && (
                  <div className="flex items-start space-x-4">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Reminder</h3>
                      <p className="text-gray-700">
                        {event.reminderMinutes} minutes before the event
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mark as Attended Action */}
              {(isUpcoming || isInProgress) && contact && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={() => setMarkAttendedDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Mark as Attended
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between text-sm text-gray-500">
              <div>
                Created: {new Date(event.createdAt || "").toLocaleDateString()}
              </div>
              {event.updatedAt && (
                <div>
                  Last Updated: {new Date(event.updatedAt).toLocaleDateString()}
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Mark as Attended dialog */}
      {contact && event && (
        <Dialog open={markAttendedDialogOpen} onOpenChange={setMarkAttendedDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Event as Attended</DialogTitle>
              <DialogDescription>
                Record that you attended "{event.title}" with {contact.firstName} {contact.lastName}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="reset-reminder"
                  checked={resetReminder}
                  onCheckedChange={setResetReminder}
                />
                <Label htmlFor="reset-reminder" className="text-sm">
                  Reset the reminder for {contact.firstName} (will be set to {format(startDate, "MMMM d, yyyy")})
                </Label>
              </div>
              
              <div className="text-sm text-gray-500">
                {resetReminder ? (
                  <p>
                    The next contact reminder for {contact.firstName} will be reset to {contact.reminderFrequency} {contact.reminderFrequency === 1 ? 'month' : 'months'} from today.
                  </p>
                ) : (
                  <p>
                    The existing contact reminder for {contact.firstName} will remain unchanged.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setMarkAttendedDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={markEventAttended}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirm Attendance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
