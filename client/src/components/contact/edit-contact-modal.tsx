import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactForm, ContactFormValues } from "./contact-form";
import { ContactWithLogsAndTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithLogsAndTags;
}

export function EditContactModal({ isOpen, onClose, contact }: EditContactModalProps) {
  const { toast } = useToast();
  
  const updateContactMutation = useMutation({
    mutationFn: async (data: { formData: ContactFormValues, tags: string[] }) => {
      const { formData, tags } = data;
      
      const contactData = {
        ...formData,
        tags
      };
      
      const res = await apiRequest("PATCH", `/api/contacts/${contact.id}`, contactData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Contact updated",
        description: "Contact has been updated successfully",
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

  const handleSubmit = (formData: ContactFormValues, tags: string[]) => {
    updateContactMutation.mutate({ formData, tags });
  };

  const defaultValues = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || "",
    phone: contact.phone || "",
    notes: contact.notes || "",
    reminderFrequency: contact.reminderFrequency,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        
        <ContactForm
          defaultValues={defaultValues}
          contact={contact}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitButtonText="Update Contact"
          isSubmitting={updateContactMutation.isPending}
          isEdit={true}
        />
      </DialogContent>
    </Dialog>
  );
}