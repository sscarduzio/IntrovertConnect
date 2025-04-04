import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertContactSchema, ContactWithLogsAndTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TagInput, Tag as TagType } from "./ui/tag-input";
import { Tag } from "@shared/schema";

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithLogsAndTags;
}

// Extend the insert schema with client-side validation
const contactFormSchema = insertContactSchema
  .extend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").or(z.string().length(0)).optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    reminderFrequency: z.number(),
  })
  .omit({ userId: true });

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function EditContactModal({ isOpen, onClose, contact }: EditContactModalProps) {
  const [tags, setTags] = useState<TagType[]>([]);
  const { toast } = useToast();
  
  const { data: existingTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: isOpen,
  });

  // Initialize form with contact data
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      reminderFrequency: contact.reminderFrequency,
    },
  });

  // Set up tags from contact
  useEffect(() => {
    if (contact.tags) {
      setTags(contact.tags.map(tag => ({ id: uuidv4(), text: tag.name })));
    }
  }, [contact.tags]);

  const updateContactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      // Extract tag names from the tag objects
      const tagNames = tags.map(tag => tag.text);
      
      const contactData = {
        ...data,
        tags: tagNames
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

  const onSubmit = (data: ContactFormValues) => {
    updateContactMutation.mutate(data);
  };

  const handleAddTag = (tagText: string) => {
    setTags([...tags, { id: uuidv4(), text: tagText }]);
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  const handleClose = () => {
    // Reset form and tags back to original values
    form.reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      reminderFrequency: contact.reminderFrequency,
    });
    setTags(contact.tags.map(tag => ({ id: uuidv4(), text: tag.name })));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Tags / Interests</FormLabel>
              <TagInput 
                tags={tags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                placeholder="Add tag and press Enter..."
              />
              {existingTags && existingTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => {
                          // Only add if not already in the list
                          if (!tags.some(t => t.text.toLowerCase() === tag.name.toLowerCase())) {
                            handleAddTag(tag.name);
                          }
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="reminderFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Frequency</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Monthly</SelectItem>
                      <SelectItem value="3">Quarterly</SelectItem>
                      <SelectItem value="6">Bi-annually</SelectItem>
                      <SelectItem value="12">Annually</SelectItem>
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
                      placeholder="Add notes about your contact here..." 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
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
                disabled={updateContactMutation.isPending}
              >
                {updateContactMutation.isPending ? "Saving..." : "Update Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}