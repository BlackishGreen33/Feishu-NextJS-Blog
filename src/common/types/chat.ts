export type GuestbookMessageStatus = 'deleted' | 'hidden' | 'published';

export type GuestbookModerationStatus = GuestbookMessageStatus;

export interface MessageProps {
  createdAt: number;
  id: string;
  uid?: string;
  name: string;
  email: string;
  image?: string;
  message: string;
  status: GuestbookMessageStatus;
  updatedAt: number;
  created_at: string;
  updated_at: string;
  deletedAt: number | null;
  deleted_at: string | null;
  is_show?: boolean;
}

export interface ChatListProps {
  messages: MessageProps[];
}

export interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
}

export interface GuestbookViewer {
  canModerate: boolean;
  isAuthenticated: boolean;
  uid: string | null;
}

export interface GuestbookMessagesPage {
  configured: boolean;
  hasMore: boolean;
  messages: MessageProps[];
  nextCursor: string | null;
  viewer: GuestbookViewer;
}

export interface GuestbookMessageMutationResponse {
  message: MessageProps | null;
  viewer: GuestbookViewer;
}

export interface GuestbookMessageRecord {
  createdAt: number;
  created_at: string;
  deletedAt: number | null;
  deleted_at: string | null;
  email: string;
  id: string;
  image: string;
  is_show: boolean;
  message: string;
  name: string;
  status: GuestbookMessageStatus;
  uid: string;
  updatedAt: number;
  updated_at: string;
}
