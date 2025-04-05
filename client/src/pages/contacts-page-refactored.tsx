import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Search, PlusCircle, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/navbar";
import { ContactWithTags, ContactWithLogsAndTags, Tag } from "@shared/schema";
import { ContactCard } from "@/components/contact-card";
import { 
  AddContactModal, 
  ContactDetailsModal, 
  MarkContactedModal 
} from "@/components/contact";

export default function ContactsPage() {
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isContactDetailsModalOpen, setIsContactDetailsModalOpen] = useState(false);
  const [isMarkContactedModalOpen, setIsMarkContactedModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactWithLogsAndTags | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<ContactWithTags[]>([]);
  
  const { 
    data: contacts, 
    isLoading: isContactsLoading, 
    error: contactsError 
  } = useQuery<ContactWithTags[]>({
    queryKey: ["/api/contacts"],
  });
  
  const { 
    data: tags, 
    isLoading: isTagsLoading,
  } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  useEffect(() => {
    if (contacts) {
      let filtered = [...contacts];
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(contact => 
          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(term) ||
          (contact.email && contact.email.toLowerCase().includes(term)) ||
          (contact.phone && contact.phone.toLowerCase().includes(term)) ||
          (contact.notes && contact.notes.toLowerCase().includes(term))
        );
      }
      
      // Filter by selected tag
      if (selectedTag) {
        filtered = filtered.filter(contact => 
          contact.tags.some(tag => tag.name === selectedTag)
        );
      }
      
      setFilteredContacts(filtered);
    }
  }, [contacts, searchTerm, selectedTag]);

  const handleOpenContactDetails = async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contact details");
      const contact = await response.json();
      setSelectedContact(contact);
      setIsContactDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching contact details:", error);
    }
  };

  const handleMarkContacted = (contact: ContactWithLogsAndTags) => {
    setSelectedContact(contact);
    setIsContactDetailsModalOpen(false);
    setIsMarkContactedModalOpen(true);
  };

  if (isContactsLoading || isTagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (contactsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">Error loading contacts</h2>
            </div>
            <p className="text-sm text-gray-600">{contactsError.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract all unique tags from contacts
  const allTags = tags || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="pb-5 border-b border-gray-200 mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => window.location.href = '/import-export'}>
                <Upload className="mr-2 h-4 w-4" />
                Import/Export
              </Button>
              <Button onClick={() => setIsAddContactModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div className="w-full md:w-1/2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts by name, email, phone..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">Filter by tag:</span>
              <div className="flex gap-2">
                {allTags.map((tag) => (
                  <Button
                    key={tag.id}
                    variant={selectedTag === tag.name ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                  >
                    {tag.name}
                    {selectedTag === tag.name && (
                      <X className="ml-1 h-3 w-3" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(null);
                      }} />
                    )}
                  </Button>
                ))}
                {selectedTag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="whitespace-nowrap text-gray-500"
                    onClick={() => setSelectedTag(null)}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs: All, Recent, Due for Follow-up */}
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Contacts</TabsTrigger>
              <TabsTrigger value="recent">Recently Added</TabsTrigger>
              <TabsTrigger value="due">Due for Follow-up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {filteredContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContacts.map(contact => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onClick={() => handleOpenContactDetails(contact.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                  <p className="text-gray-500 mb-6">
                    {contacts && contacts.length > 0
                      ? "Try adjusting your search or filters."
                      : "Get started by adding your first contact."}
                  </p>
                  {contacts && contacts.length === 0 && (
                    <Button onClick={() => setIsAddContactModalOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add your first contact
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent">
              {filteredContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...filteredContacts]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 6)
                    .map(contact => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onClick={() => handleOpenContactDetails(contact.id)}
                      />
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent contacts found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="due">
              {filteredContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContacts
                    .filter(contact => contact.nextContactDate && new Date(contact.nextContactDate) <= new Date())
                    .map(contact => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onClick={() => handleOpenContactDetails(contact.id)}
                      />
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts due for follow-up</h3>
                  <p className="text-gray-500">You're all caught up with your contacts!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} IntroConnect. All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* Modals */}
      <AddContactModal 
        isOpen={isAddContactModalOpen} 
        onClose={() => setIsAddContactModalOpen(false)}
      />
      
      {selectedContact && (
        <>
          <ContactDetailsModal 
            isOpen={isContactDetailsModalOpen}
            onClose={() => setIsContactDetailsModalOpen(false)}
            contact={selectedContact}
            onMarkContacted={() => handleMarkContacted(selectedContact)}
          />
          
          <MarkContactedModal 
            isOpen={isMarkContactedModalOpen}
            onClose={() => setIsMarkContactedModalOpen(false)}
            contact={selectedContact}
          />
        </>
      )}
    </div>
  );
}