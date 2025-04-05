import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ContactWithLogsAndTags } from "@shared/schema";

export const contactLogSchema = z.object({
  contactDate: z.string(),
  contactType: z.string(),
  notes: z.string().optional(),
  nextReminderFrequency: z.string(),
  gotResponse: z.boolean().default(false),
  responseDate: z.string().optional(),
});

export type ContactLogFormValues = z.infer<typeof contactLogSchema>;

export interface ContactLogFormProps {
  contact: ContactWithLogsAndTags;
  onSubmit: (data: ContactLogFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ContactLogForm({
  contact,
  onSubmit,
  onCancel,
  isSubmitting,
}: ContactLogFormProps) {
  const form = useForm<ContactLogFormValues>({
    resolver: zodResolver(contactLogSchema),
    defaultValues: {
      contactDate: format(new Date(), "yyyy-MM-dd"),
      contactType: "call",
      notes: "",
      nextReminderFrequency: "default",
      gotResponse: false,
      responseDate: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="contactDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contactType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Type</FormLabel>
              <Select 
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="coffee">Coffee Meetup</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="What did you talk about?" 
                  className="resize-none h-20"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="nextReminderFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Reminder</FormLabel>
              <Select 
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select next reminder time" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="default">
                    Use Default ({contact.reminderFrequency} {contact.reminderFrequency === 1 ? 'month' : 'months'})
                  </SelectItem>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="2">2 months</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Saving..." : "Save & Reset Reminder"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}