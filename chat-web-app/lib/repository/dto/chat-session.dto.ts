export interface CreateChatSessionDto {
    userId: string;
    title?: string;
}

export interface ChatSessionDto {
    id: string;
    userId: string;
    title?: string | null;
    primaryTranscriptId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateChatSessionDto {
    title?: string;
    primaryTranscriptId?: string;
}
