import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactForm, ContactFormValues } from "./contact-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const createContactMutation = useMutation({
    mutationFn: async (data: { formData: ContactFormValues, tags: string[] }) => {
      const { formData, tags } = data;
      
      const contactData = {
        ...formData,
        userId: user?.id,
        tags
      };
      
      const res = await apiRequest("POST", "/api/contacts", contactData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Contact added",
        description: "Contact has been added successfully",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (formData: ContactFormValues, tags: string[]) => {
    createContactMutation.mutate({ formData, tags });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <ContactForm
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitButtonText="Save Contact"
          isSubmitting={createContactMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}