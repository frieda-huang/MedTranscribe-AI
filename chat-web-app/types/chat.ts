import { CoreMessage } from 'ai';

export interface FileAttachment {
    name: string;
    content: string;
    contentType: string;
    file?: string; // Add optional file property for direct file data
    // We'll keep using content for backward compatibility
}

// This type is needed for Vercel AI SDK integration
export type MessageWithAttachments = CoreMessage & {
    experimental_attachments?: FileAttachment[];
};

// API request type for the chat route
export interface ChatRequest {
    messages: MessageWithAttachments[];
    model: string;
}
