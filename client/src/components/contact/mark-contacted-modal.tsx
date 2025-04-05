import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactLogForm, ContactLogFormValues } from "./contact-log-form";
import { ContactWithLogsAndTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MarkContactedModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithLogsAndTags;
}

export function MarkContactedModal({ 
  isOpen, 
  onClose, 
  contact 
}: MarkContactedModalProps) {
  const { toast } = useToast();
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Contact updated",
        description: "Contact has been marked as contacted and reminder has been reset.",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ContactLogFormValues) => {
    logContactMutation.mutate(data);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Meeting with {contact.firstName} {contact.lastName}</DialogTitle>
        </DialogHeader>
        
        <ContactLogForm
          contact={contact}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isSubmitting={logContactMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}