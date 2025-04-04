import { ContactWithTags } from "@shared/schema";

interface ContactCardProps {
  contact: ContactWithTags;
  onClick: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  // Get initials from first and last name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  // Get readable text for last contact date
  const getLastContactText = (date: Date | null): string => {
    if (!date) return "Never contacted";
    
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
  };

  // Get status for next contact date
  const getDueStatus = (date: Date | null): string => {
    if (!date) return "No reminder set";
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Due ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else {
      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  // Get CSS class for due status
  const getDueStatusClass = (status: string): string => {
    if (status.includes('ago')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (status === 'Due today') {
      return 'bg-orange-100 text-orange-800';
    } else if (status === 'No reminder set') {
      return 'bg-gray-100 text-gray-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
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

  const lastContactText = getLastContactText(contact.lastContactDate ? new Date(contact.lastContactDate) : null);
  const dueStatus = getDueStatus(contact.nextContactDate ? new Date(contact.nextContactDate) : null);
  const dueStatusClass = getDueStatusClass(dueStatus);
  const avatarColor = getAvatarColor(`${contact.firstName} ${contact.lastName}`);
  const initials = getInitials(`${contact.firstName} ${contact.lastName}`);

  return (
    <div 
      className="bg-white shadow overflow-hidden rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="px-4 py-4">
        <div className="flex items-center">
          <div className={`h-12 w-12 rounded-full text-white flex items-center justify-center ${avatarColor}`}>
            <span className="font-medium">{initials}</span>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{contact.firstName} {contact.lastName}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {contact.tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {tag.name}
                </span>
              ))}
              {contact.tags.length > 3 && (
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                  +{contact.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {contact.email && (
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="truncate">{contact.email}</p>
            </div>
          )}
          {contact.phone && (
            <div>
              <span className="text-gray-500">Phone:</span>
              <p>{contact.phone}</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last contact: {lastContactText}
          </div>
          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${dueStatusClass}`}>
            {dueStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
