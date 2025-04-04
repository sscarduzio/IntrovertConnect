import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { ContactWithLogsAndTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, CheckCircle, Calendar, Phone, Mail, Clock, TagIcon, MessageSquare } from "lucide-react";

interface ContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithLogsAndTags;
  onMarkContacted: () => void;
}

export function ContactDetailsModal({ 
  isOpen, 
  onClose, 
  contact, 
  onMarkContacted 
}: ContactDetailsModalProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const deleteContactMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${contact.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Contact deleted",
        description: "Contact has been deleted successfully",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteContactMutation.mutate();
  };

  // Get initials from first and last name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Format date in readable format
  const formatDate = (date: Date | null): string => {
    if (!date) return "Not set";
    return format(new Date(date), "MMM d, yyyy");
  };

  // Get a background color based on the contact's name
  const getAvatarColor = (name: string): string => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", 
      "bg-pink-500", "bg-yellow-500", "bg-red-500", 
      "bg-indigo-500", "bg-teal-500"
    ];
    
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + acc;
    }, 0);
    
    return colors[hash % colors.length];
  };

  const avatarColor = getAvatarColor(`${contact.firstName} ${contact.lastName}`);
  const initials = getInitials(`${contact.firstName} ${contact.lastName}`);
  
  // Get formatted reminder frequency
  const getReminderFrequency = (months: number): string => {
    switch(months) {
      case 1: return "Monthly";
      case 3: return "Quarterly";
      case 6: return "Bi-annually";
      case 12: return "Annually";
      default: return `Every ${months} months`;
    }
  };

  // Determine if contact is due for follow-up
  const isOverdue = contact.nextContactDate && new Date(contact.nextContactDate) <= new Date();

  // Get CSS class for next reminder based on due status
  const getNextReminderClass = (): string => {
    if (!contact.nextContactDate) return "text-gray-700";
    return isOverdue ? "text-red-500 font-medium" : "text-gray-900";
  };

  // Get icon for contact log based on contact type
  const getContactLogIcon = (type: string): JSX.Element => {
    switch(type.toLowerCase()) {
      case "call":
      case "phone call":
        return <Phone className="h-4 w-4 text-gray-400" />;
      case "coffee":
      case "coffee meetup":
        return (
          <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
            <line x1="6" y1="2" x2="6" y2="4"></line>
            <line x1="10" y1="2" x2="10" y2="4"></line>
            <line x1="14" y1="2" x2="14" y2="4"></line>
          </svg>
        );
      case "email":
        return <Mail className="h-4 w-4 text-gray-400" />;
      case "lunch":
      case "dinner":
        return (
          <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        );
      case "meeting":
        return <Calendar className="h-4 w-4 text-gray-400" />;
      case "text":
      case "text message":
        return <MessageSquare className="h-4 w-4 text-gray-400" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Contact Details</span>
              <div className="flex space-x-2">
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8 text-red-500 hover:text-white hover:bg-red-500"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center">
              <div className={`h-16 w-16 rounded-full text-white flex items-center justify-center ${avatarColor}`}>
                <span className="text-2xl font-medium">{initials}</span>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {contact.firstName} {contact.lastName}
                </h2>
                <div className="mt-1 flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <dl className="divide-y divide-gray-200">
                {contact.email && (
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </dt>
                    <dd className="text-gray-900 truncate">{contact.email}</dd>
                  </div>
                )}
                
                {contact.phone && (
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone
                    </dt>
                    <dd className="text-gray-900">{contact.phone}</dd>
                  </div>
                )}
                
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last Contact
                  </dt>
                  <dd className="text-gray-900">
                    {formatDate(contact.lastContactDate)}
                  </dd>
                </div>
                
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Reminder Frequency
                  </dt>
                  <dd className="text-gray-900">
                    {getReminderFrequency(contact.reminderFrequency)}
                  </dd>
                </div>
                
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Next Reminder
                  </dt>
                  <dd className={getNextReminderClass()}>
                    {contact.nextContactDate 
                      ? isOverdue 
                        ? `Overdue (${formatDate(contact.nextContactDate)})` 
                        : formatDate(contact.nextContactDate)
                      : "Not scheduled"
                    }
                  </dd>
                </div>
              </dl>
            </div>
            
            {contact.notes && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 flex items-center">
                  <TagIcon className="h-4 w-4 mr-2" />
                  Notes
                </h4>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                  {contact.notes}
                </div>
              </div>
            )}
            
            <div className="mt-5 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Contact History
              </h4>
              
              {contact.logs && contact.logs.length > 0 ? (
                <ul className="mt-2 divide-y divide-gray-200">
                  {contact.logs.map((log) => (
                    <li key={log.id} className="py-3">
                      <div className="flex space-x-3">
                        {getContactLogIcon(log.contactType)}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">{log.contactType}</h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(log.contactDate)}
                            </p>
                          </div>
                          {log.notes && (
                            <p className="text-sm text-gray-500">{log.notes}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No contact history recorded yet.</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Close
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={onMarkContacted}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Contacted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {contact.firstName} {contact.lastName} from your contacts. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleteContactMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
