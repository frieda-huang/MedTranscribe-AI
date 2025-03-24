import { FileAttachment } from '@/types/chat';

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface CreateMessageDto {
    content: string;
    role: MessageRole;
    sessionId: string;
    attachments?: FileAttachment[];
}

export interface MessageDto {
    id: string;
    content: string;
    role: MessageRole;
    sessionId: string;
    createdAt: Date;
}

export interface GetMessagesOptions {
    sessionId: string;
    limit?: number;
    offset?: number;
}
