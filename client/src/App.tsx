import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ContactsPage from "@/pages/contacts-page";
import RemindersPage from "@/pages/reminders-page";
import TagsPage from "@/pages/tags-page";
import EventsPage from "@/pages/events-page";
import EventDetailPage from "@/pages/event-detail-page";
import EventCreatePage from "@/pages/event-create-page";
import ImportExportPage from "@/pages/import-export-page";
import SettingsPage from "@/pages/settings-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/contacts" component={ContactsPage} />
      <ProtectedRoute path="/reminders" component={RemindersPage} />
      <ProtectedRoute path="/tags" component={TagsPage} />
      <ProtectedRoute path="/events" component={EventsPage} />
      <ProtectedRoute path="/events/new" component={EventCreatePage} />
      <ProtectedRoute path="/events/:id" component={EventDetailPage} />
      <ProtectedRoute path="/events/:id/edit" component={EventCreatePage} />
      <ProtectedRoute path="/import-export" component={ImportExportPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
