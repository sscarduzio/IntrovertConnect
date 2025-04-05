import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Download, Upload, CheckCircle, X } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function ImportExportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{ 
    success: number; 
    errors: number; 
    details: string[] 
  } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle export - this will trigger a file download
  const handleExport = async () => {
    try {
      // Directly trigger the file download by creating a link and clicking it
      const a = document.createElement('a');
      a.href = '/api/export/contacts';
      a.download = `contacts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Export started",
        description: "Your contacts are being downloaded as a JSON file.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle file change for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Mutation for importing contacts
  const importMutation = useMutation({
    mutationFn: async (data: { contacts: any[] }) => {
      const res = await apiRequest("POST", "/api/import/contacts", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.success} contacts. ${data.errors} errors.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle import submission
  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a JSON file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileContent = await file.text();
      let contactsData;
      
      try {
        contactsData = JSON.parse(fileContent);
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "The selected file does not contain valid JSON",
          variant: "destructive",
        });
        return;
      }
      
      // Check if it's an array or if it has a contacts property
      const contacts = Array.isArray(contactsData) ? contactsData : 
                       (contactsData.contacts && Array.isArray(contactsData.contacts) ? contactsData.contacts : null);
      
      if (!contacts) {
        toast({
          title: "Invalid format",
          description: "The JSON file must contain an array of contacts or a contacts array property",
          variant: "destructive",
        });
        return;
      }
      
      importMutation.mutate({ contacts });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Import & Export Contacts</h1>
      
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="export">Export Contacts</TabsTrigger>
          <TabsTrigger value="import">Import Contacts</TabsTrigger>
        </TabsList>
        
        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Your Contacts</CardTitle>
              <CardDescription>
                Download your contacts as a JSON file that you can back up or import into another account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>What's included in the export?</AlertTitle>
                <AlertDescription>
                  The export includes all your contacts with their details, tags, and reminder settings.
                  Personal notes and contact history logs will also be included.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExport} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Contacts
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Contacts</CardTitle>
              <CardDescription>
                Import contacts from a JSON file that was previously exported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Before you import</AlertTitle>
                <AlertDescription>
                  The import file should be in JSON format. You can import contacts exported from this app or
                  prepare a custom import file following the required format.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-accent file:text-accent-foreground
                    hover:file:bg-accent/80"
                />
                
                {file && (
                  <div className="text-sm text-muted-foreground">
                    Selected file: {file.name}
                  </div>
                )}
              </div>
              
              {importResults && (
                <div className="mt-6">
                  <h3 className="font-medium text-lg mb-2">Import Results</h3>
                  <div className="flex gap-4 mb-4">
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-2 rounded flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {importResults.success} successful
                    </div>
                    {importResults.errors > 0 && (
                      <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-2 rounded flex items-center">
                        <X className="h-4 w-4 mr-2" />
                        {importResults.errors} failed
                      </div>
                    )}
                  </div>
                  
                  {importResults.details.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
                      {importResults.details.map((detail, i) => (
                        <div key={i} className="mb-1">
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={!file || importMutation.isPending} 
                className="flex-1"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Contacts
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/contacts")} className="flex-1">
                Back to Contacts
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}