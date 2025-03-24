import { FileAttachment } from '@/types/chat';
import {
    ChatSessionDto,
    CreateChatSessionDto,
    UpdateChatSessionDto,
    MessageDto,
    CreateMessageDto,
    GetMessagesOptions,
    TranscriptDto,
} from '../dto';

export interface IChatRepository {
    createSession(data: CreateChatSessionDto): Promise<ChatSessionDto>;
    getSession(id: string): Promise<ChatSessionDto | null>;
    updateSession(
        id: string,
        data: UpdateChatSessionDto
    ): Promise<ChatSessionDto>;

    saveMessage(data: CreateMessageDto): Promise<MessageDto>;
    getMessages(options: GetMessagesOptions): Promise<MessageDto[]>;

    saveTranscriptFile(
        attachment: FileAttachment,
        sessionId: string,
        userId: string
    ): Promise<TranscriptDto>;
}
