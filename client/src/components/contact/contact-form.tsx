import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { insertContactSchema, ContactWithLogsAndTags, Tag } from "@shared/schema";
import { TagInput, Tag as TagType } from "../ui/tag-input";
import { useAuth } from "@/hooks/use-auth";

// Extend the insert schema with client-side validation
export const contactFormSchema = insertContactSchema
  .extend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").or(z.string().length(0)).optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    reminderFrequency: z.number(),
  })
  .omit({ userId: true });

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export interface ContactFormProps {
  defaultValues?: ContactFormValues;
  contact?: ContactWithLogsAndTags;
  onSubmit: (data: ContactFormValues, tags: string[]) => void;
  onCancel: () => void;
  submitButtonText: string;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function ContactForm({
  defaultValues,
  contact,
  onSubmit,
  onCancel,
  submitButtonText,
  isSubmitting,
  isEdit = false
}: ContactFormProps) {
  const [tags, setTags] = useState<TagType[]>([]);
  const { user } = useAuth();
  
  const { data: existingTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Initialize form with provided values or defaults
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: defaultValues || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      notes: "",
      reminderFrequency: 3, // Default to quarterly reminders
    },
  });

  // Set up tags from contact if in edit mode
  useEffect(() => {
    if (isEdit && contact?.tags) {
      setTags(contact.tags.map(tag => ({ id: uuidv4(), text: tag.name })));
    }
  }, [contact?.tags, isEdit]);

  const handleFormSubmit = (data: ContactFormValues) => {
    // Extract tag names from the tag objects
    const tagNames = tags.map(tag => tag.text);
    onSubmit(data, tagNames);
  };

  const handleAddTag = (tagText: string) => {
    setTags([...tags, { id: uuidv4(), text: tagText }]);
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
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
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : submitButtonText}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}