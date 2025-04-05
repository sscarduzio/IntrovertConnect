import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ContactForm } from '../../client/src/components/contact/contact-form';
import { ContactLogForm } from '../../client/src/components/contact/contact-log-form';
import { AddContactModal } from '../../client/src/components/contact/add-contact-modal';
import { EditContactModal } from '../../client/src/components/contact/edit-contact-modal';
import { MarkContactedModal } from '../../client/src/components/contact/mark-contacted-modal';
import { queryClient } from '../../client/src/lib/queryClient';
import { mockContact, mockContactWithLogsAndTags } from '../utils';

// Mock the react-query hooks
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    }),
    useMutation: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    }),
  };
});

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1 },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

// Wrapper component for testing
const Wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ContactForm Component', () => {
  it('should render with default values', () => {
    render(
      <ContactForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitButtonText="Save"
        isSubmitting={false}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByText(/save/i)).toBeInTheDocument();
  });

  it('should call onSubmit when form is submitted', async () => {
    const onSubmitMock = vi.fn();
    
    render(
      <ContactForm
        onSubmit={onSubmitMock}
        onCancel={vi.fn()}
        submitButtonText="Save"
        isSubmitting={false}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    
    fireEvent.click(screen.getByText(/save/i));
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled();
    });
  });
});

describe('ContactLogForm Component', () => {
  it('should render with correct fields', () => {
    render(
      <ContactLogForm
        contact={mockContactWithLogsAndTags}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByLabelText(/meeting date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meeting type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next reminder/i)).toBeInTheDocument();
    expect(screen.getByText(/save & reset reminder/i)).toBeInTheDocument();
  });
});

describe('AddContactModal Component', () => {
  it('should render modal when isOpen is true', () => {
    render(
      <AddContactModal 
        isOpen={true} 
        onClose={vi.fn()} 
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/add new contact/i)).toBeInTheDocument();
  });
});

describe('EditContactModal Component', () => {
  it('should render with contact data', () => {
    render(
      <EditContactModal 
        isOpen={true} 
        onClose={vi.fn()} 
        contact={mockContactWithLogsAndTags}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/edit contact/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockContactWithLogsAndTags.firstName)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockContactWithLogsAndTags.lastName)).toBeInTheDocument();
  });
});

describe('MarkContactedModal Component', () => {
  it('should render with contact name in title', () => {
    render(
      <MarkContactedModal 
        isOpen={true} 
        onClose={vi.fn()} 
        contact={mockContactWithLogsAndTags}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(new RegExp(`record meeting with ${mockContactWithLogsAndTags.firstName}`, 'i'))).toBeInTheDocument();
  });
});