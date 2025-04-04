import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactWithLogsAndTags } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MarkContactedModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithLogsAndTags;
}

const contactLogSchema = z.object({
  contactDate: z.string(),
  contactType: z.string(),
  notes: z.string().optional(),
  nextReminderFrequency: z.string(),
});

type ContactLogFormValues = z.infer<typeof contactLogSchema>;

export function MarkContactedModal({ 
  isOpen, 
  onClose, 
  contact 
}: MarkContactedModalProps) {
  const { toast } = useToast();
  
  const form = useForm<ContactLogFormValues>({
    resolver: zodResolver(contactLogSchema),
    defaultValues: {
      contactDate: format(new Date(), "yyyy-MM-dd"),
      contactType: "call",
      notes: "",
      nextReminderFrequency: "default",
    },
  });

  const logContactMutation = useMutation({
    mutationFn: async (data: ContactLogFormValues) => {
      // Process reminder frequency
      let reminderFrequency = data.nextReminderFrequency;
      
      const contactLogData = {
        contactDate: data.contactDate,  // Send as string, not Date object
        contactType: data.contactType,
        notes: data.notes,
        reminderFrequency: reminderFrequency === "default" ? contact.reminderFrequency : parseInt(reminderFrequency),
      };
      
      const res = await apiRequest("POST", `/api/contacts/${contact.id}/logs`, contactLogData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Contact updated",
        description: "Contact has been marked as contacted and reminder has been reset.",
      });
      
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactLogFormValues) => {
    logContactMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset({
      contactDate: format(new Date(), "yyyy-MM-dd"),
      contactType: "call",
      notes: "",
      nextReminderFrequency: "default",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Contact with {contact.firstName} {contact.lastName}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="contactDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Date</FormLabel>
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
                  <FormLabel>Contact Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact type" />
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
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={logContactMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {logContactMutation.isPending ? "Saving..." : "Save & Reset Reminder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
