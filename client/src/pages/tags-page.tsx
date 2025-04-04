import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag } from "@shared/schema";
import { Loader2, AlertCircle, Plus, X, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ContactWithTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { ContactCard } from "@/components/contact-card";

export default function TagsPage() {
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const { toast } = useToast();

  const { 
    data: tags, 
    isLoading: isTagsLoading, 
    error: tagsError 
  } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const { 
    data: contacts, 
    isLoading: isContactsLoading 
  } = useQuery<ContactWithTags[]>({
    queryKey: ["/api/contacts"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/tags", { name });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsAddTagModalOpen(false);
      setNewTagName("");
      toast({
        title: "Tag created",
        description: "Tag has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("DELETE", `/api/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Tag deleted",
        description: "Tag has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Tag name required",
        description: "Please enter a tag name",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate(newTagName.trim());
  };

  const handleDeleteTag = (tagId: number) => {
    if (confirm("Are you sure you want to delete this tag? This will remove it from all contacts.")) {
      deleteTagMutation.mutate(tagId);
      if (selectedTag && selectedTag.id === tagId) {
        setSelectedTag(null);
      }
    }
  };

  // Filter tags by search term
  const filteredTags = tags?.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get contacts with selected tag
  const contactsWithSelectedTag = selectedTag
    ? contacts?.filter(contact => 
        contact.tags.some(tag => tag.id === selectedTag.id)
      )
    : [];

  if (isTagsLoading || isContactsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tagsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h2 className="text-lg font-semibold">Error loading tags</h2>
            </div>
            <p className="text-sm text-gray-600">{tagsError.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="pb-5 border-b border-gray-200 mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Interest Tags</h1>
            <Button onClick={() => setIsAddTagModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tags List */}
            <div className="md:col-span-1">
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">All Tags</h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Group your contacts by shared interests
                  </p>
                  <div className="mt-4">
                    <Input
                      type="text"
                      placeholder="Search tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => {
                      const tagContactCount = contacts?.filter(contact => 
                        contact.tags.some(t => t.id === tag.id)
                      ).length || 0;
                      
                      const isSelected = selectedTag?.id === tag.id;

                      return (
                        <li key={tag.id}>
                          <div 
                            className={`px-4 py-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
                            onClick={() => setSelectedTag(isSelected ? null : tag)}
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md bg-purple-100 text-purple-600">
                                <TagIcon className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                                <div className="text-sm text-gray-500">{tagContactCount} contacts</div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                              }}
                            >
                              <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="px-4 py-6 text-center text-gray-500">
                      {searchTerm 
                        ? "No tags match your search" 
                        : "No tags created yet. Add your first tag to get started."}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Contacts with Selected Tag */}
            <div className="md:col-span-2">
              {selectedTag ? (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Contacts tagged with "{selectedTag.name}"
                    </h2>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedTag(null)}
                    >
                      Clear selection
                    </Button>
                  </div>
                  
                  {contactsWithSelectedTag && contactsWithSelectedTag.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contactsWithSelectedTag.map(contact => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onClick={() => {
                            // In a complete implementation, this would open the contact details modal
                            window.location.href = `/contacts?id=${contact.id}`;
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-md shadow text-center">
                      <p className="text-gray-500">No contacts with this tag yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-md shadow text-center">
                  <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Select a tag</h3>
                  <p className="mt-1 text-gray-500">
                    Choose a tag from the list to see contacts associated with it.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} IntrovertConnect. All rights reserved.
          </p>
        </div>
      </footer>
      
      {/* Add Tag Modal */}
      <Dialog open={isAddTagModalOpen} onOpenChange={setIsAddTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tag</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="tagName" className="block text-sm font-medium text-gray-700">Tag Name</label>
                <Input
                  id="tagName"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddTagModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTag}
              disabled={createTagMutation.isPending}
            >
              {createTagMutation.isPending ? "Creating..." : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
