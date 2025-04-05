import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCalendarEventSchema, ContactWithTags, CalendarEvent } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  location: z.string().optional().default(""),
  contactId: z.number({
    required_error: "Contact is required"
  }),
  reminderMinutes: z.number().nullable().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Start time must be in the format HH:MM",
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "End time must be in the format HH:MM",
  }),
}).refine((data) => {
  const startDateTime = new Date(data.startDate);
  const [startHours, startMinutes] = data.startTime.split(':').map(Number);
  startDateTime.setHours(startHours, startMinutes);

  const endDateTime = new Date(data.endDate);
  const [endHours, endMinutes] = data.endTime.split(':').map(Number);
  endDateTime.setHours(endHours, endMinutes);

  return endDateTime > startDateTime;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function EventCreatePage() {
  const [, navigate] = useLocation();
  const [matchesEditRoute, editParams] = useRoute('/events/:id/edit');
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [pageTitle, setPageTitle] = useState("Create New Event");
  const [submitButtonText, setSubmitButtonText] = useState("Create Event");

  // Get eventId from route params if in edit mode
  const eventId = matchesEditRoute && editParams?.id ? parseInt(editParams.id) : -1;

  // Fetch contacts for dropdown
  const { data: contacts, isLoading: contactsLoading } = useQuery<ContactWithTags[]>({
    queryKey: ["/api/contacts"],
  });

  // Fetch event details if in edit mode
  const { data: eventData, isLoading: eventLoading } = useQuery<CalendarEvent>({
    queryKey: ['/api/events', eventId],
    enabled: eventId > 0,
  });

  // Form setup
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startDate: new Date(),
      endDate: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      reminderMinutes: 30,
    },
  });
  
  // Update form when event data is loaded
  useEffect(() => {
    if (eventData) {
      setIsEditMode(true);
      setPageTitle("Edit Event");
      setSubmitButtonText("Update Event");
      
      // Format times for form
      const startDate = new Date(eventData.startDate);
      const endDate = new Date(eventData.endDate);
      
      const formatTimeForInput = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      // Set form values ensuring no null values are passed
      form.reset({
        title: eventData.title,
        description: eventData.description || "",
        location: eventData.location || "",
        contactId: eventData.contactId,
        startDate: startDate,
        endDate: endDate,
        startTime: formatTimeForInput(startDate),
        endTime: formatTimeForInput(endDate),
        reminderMinutes: eventData.reminderMinutes || 30,
      });
    }
  }, [eventData, form]);

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (formData: EventFormValues) => {
      // Convert form data to API schema
      const startDateTime = new Date(formData.startDate);
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes);

      const endDateTime = new Date(formData.endDate);
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes);

      const eventData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
      };

      // Remove form-specific fields
      delete (eventData as any).startTime;
      delete (eventData as any).endTime;

      const res = await apiRequest("POST", "/api/events", eventData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event created",
        description: "The event has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      navigate(`/events/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (formData: EventFormValues) => {
      // Convert form data to API schema
      const startDateTime = new Date(formData.startDate);
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes);

      const endDateTime = new Date(formData.endDate);
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes);

      const eventDataToUpdate = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
      };

      // Remove form-specific fields
      delete (eventDataToUpdate as any).startTime;
      delete (eventDataToUpdate as any).endTime;

      const res = await apiRequest("PATCH", `/api/events/${eventId}`, eventDataToUpdate);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event updated",
        description: "The event has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      navigate(`/events/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormValues) => {
    if (isEditMode) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  if (contactsLoading || (eventId > 0 && eventLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-gray-600 mt-1">
              {isEditMode 
                ? "Update details for this event" 
                : "Schedule a meetup or event with one of your contacts"}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Coffee meetup, Lunch, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a contact" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contacts && contacts.map((contact) => (
                              <SelectItem 
                                key={contact.id} 
                                value={contact.id.toString()}
                              >
                                {contact.firstName} {contact.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The contact you'll be meeting with
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-gray-500" />
                              <Input
                                type="time"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-gray-500" />
                              <Input
                                type="time"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Coffee shop, restaurant, office, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add details about this event..."
                            className="resize-y min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reminderMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reminder time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">No reminder</SelectItem>
                            <SelectItem value="5">5 minutes before</SelectItem>
                            <SelectItem value="15">15 minutes before</SelectItem>
                            <SelectItem value="30">30 minutes before</SelectItem>
                            <SelectItem value="60">1 hour before</SelectItem>
                            <SelectItem value="120">2 hours before</SelectItem>
                            <SelectItem value="1440">1 day before</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          When you want to be reminded about this event
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate('/events')}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isEditMode ? updateEventMutation.isPending : createEventMutation.isPending}
                    >
                      {(isEditMode ? updateEventMutation.isPending : createEventMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {submitButtonText}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

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