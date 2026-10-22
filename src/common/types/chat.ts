import type { z } from 'zod';

import type {
  guestbookMessageSchema,
  guestbookMutationSchema,
  guestbookPageSchema,
  guestbookRecordSchema,
  guestbookStatusSchema,
  guestbookViewerSchema,
} from '@/common/schemas/guestbook';
export type GuestbookMessageStatus = z.infer<typeof guestbookStatusSchema>;
export type GuestbookModerationStatus = GuestbookMessageStatus;
export type MessageProps = z.infer<typeof guestbookMessageSchema>;
export type GuestbookViewer = z.infer<typeof guestbookViewerSchema>;
export type GuestbookMessagesPage = z.infer<typeof guestbookPageSchema>;
export type GuestbookMessageMutationResponse = z.infer<
  typeof guestbookMutationSchema
>;
export type GuestbookMessageRecord = z.infer<typeof guestbookRecordSchema>;

export interface ChatListProps {
  messages: MessageProps[];
}

export interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
}
