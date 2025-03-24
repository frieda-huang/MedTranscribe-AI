import { FileAttachment } from '@/types/chat';
import { prisma } from '@/lib/db/client';
import { IChatRepository } from '../interfaces/chat-repository.interface';
import {
    ChatSessionDto,
    CreateChatSessionDto,
    UpdateChatSessionDto,
    MessageDto,
    CreateMessageDto,
    GetMessagesOptions,
    TranscriptDto,
    MessageRole,
} from '../dto';
import { extractPatientInfoFromTranscript, PatientInfo } from '@/lib/utils';

/**
 * ChatRepository implements the IChatRepository interface,
 * encapsulating all database operations for chat sessions, messages,
 * attachments, and transcript files.
 */
export class ChatRepository implements IChatRepository {
    /**
     * Converts our internal MessageRole enum to the string values
     * that Prisma expects for the chatMessage table.
     */
    private toPrismaRole(role: MessageRole): 'USER' | 'ASSISTANT' {
        return role === MessageRole.USER ? 'USER' : 'ASSISTANT';
    }

    /**
     * Converts a role stored in the database to our internal MessageRole enum.
     */
    private toMessageDtoRole(role: 'USER' | 'ASSISTANT'): MessageRole {
        return role === 'USER' ? MessageRole.USER : MessageRole.ASSISTANT;
    }

    /**
     * Converts a raw message record from the database into a MessageDto.
     */
    private toMessageDto(message: any): MessageDto {
        return {
            id: message.id,
            content: message.content,
            role: this.toMessageDtoRole(message.role),
            sessionId: message.sessionId,
            createdAt: message.createdAt,
        };
    }

    /**
     * Finds or creates a patient based on extracted information from transcript.
     */
    private async findOrCreatePatient(
        patientInfo: PatientInfo
    ): Promise<{ id: string }> {
        // If we have a medical ID, try to find the patient by that first
        if (patientInfo.medicalId) {
            const existingPatient = await prisma.patient.findFirst({
                where: { medicalId: patientInfo.medicalId },
            });

            if (existingPatient) {
                return existingPatient;
            }
        }

        // If no medicalId or patient not found by medicalId, try to find by name and DOB
        if (patientInfo.dateOfBirth) {
            const existingPatient = await prisma.patient.findFirst({
                where: {
                    name: patientInfo.name,
                    dateOfBirth: patientInfo.dateOfBirth,
                },
            });

            if (existingPatient) {
                return existingPatient;
            }
        }

        // If no DOB or patient not found by name and DOB, try to find by name alone
        if (patientInfo.name !== 'Unknown Patient') {
            const existingPatient = await prisma.patient.findFirst({
                where: { name: patientInfo.name },
            });

            if (existingPatient) {
                return existingPatient;
            }
        }

        // If still no match, create a new patient
        return prisma.patient.create({
            data: {
                name: patientInfo.name,
                dateOfBirth: patientInfo.dateOfBirth,
                medicalId: patientInfo.medicalId,
            },
        });
    }

    /**
     * Creates a new chat session for a user.
     */
    async createSession(data: CreateChatSessionDto): Promise<ChatSessionDto> {
        return prisma.chatSession.create({
            data: {
                userId: data.userId,
                title: data.title || 'New Chat',
            },
        });
    }

    /**
     * Retrieves a chat session by its unique identifier.
     */
    async getSession(id: string): Promise<ChatSessionDto | null> {
        return prisma.chatSession.findUnique({ where: { id } });
    }

    /**
     * Updates a chat session with new data.
     */
    async updateSession(
        id: string,
        data: UpdateChatSessionDto
    ): Promise<ChatSessionDto> {
        return prisma.chatSession.update({
            where: { id },
            data,
        });
    }

    /**
     * Saves a chat message to the database, including any attached files.
     */
    async saveMessage(data: CreateMessageDto): Promise<MessageDto> {
        const message = await prisma.chatMessage.create({
            data: {
                content: data.content,
                role: this.toPrismaRole(data.role),
                sessionId: data.sessionId,
            },
        });

        // If there are any attachments, create fileAttachment records.
        if (data.attachments?.length) {
            await Promise.all(
                data.attachments.map((attachment) =>
                    prisma.fileAttachment.create({
                        data: {
                            name: attachment.name,
                            contentType: attachment.contentType,
                            content: attachment.content || '',
                            messageId: message.id,
                        },
                    })
                )
            );
        }

        return this.toMessageDto(message);
    }

    /**
     * Retrieves messages for a specific chat session.
     * Supports pagination via 'take' and 'skip' options.
     */
    async getMessages(options: GetMessagesOptions): Promise<MessageDto[]> {
        const messages = await prisma.chatMessage.findMany({
            where: { sessionId: options.sessionId },
            orderBy: { createdAt: 'asc' },
            take: options.limit,
            skip: options.offset,
            include: { FileAttachment: true },
        });
        return messages.map(this.toMessageDto);
    }

    /**
     * Links a transcript to a chat session by creating a transcriptReference record.
     * If the session does not yet have a primary transcript, updates it.
     */
    private async linkTranscriptToSession(
        transcriptId: string,
        sessionId: string
    ): Promise<void> {
        await prisma.transcriptReference.create({
            data: { transcriptId, chatSessionId: sessionId },
        });
        const session = await prisma.chatSession.findUnique({
            where: { id: sessionId },
            select: { primaryTranscriptId: true },
        });
        if (!session?.primaryTranscriptId) {
            await prisma.chatSession.update({
                where: { id: sessionId },
                data: { primaryTranscriptId: transcriptId },
            });
        }
    }

    /**
     * Saves a transcript file into the database.
     * It uses a default patient for prototyping and links the transcript to a chat session.
     */
    async saveTranscriptFile(
        attachment: FileAttachment,
        sessionId: string,
        userId: string
    ): Promise<TranscriptDto> {
        const content = attachment.content || '';
        const patientInfo = await extractPatientInfoFromTranscript(content);
        const patient = await this.findOrCreatePatient(patientInfo);

        const transcript = await prisma.transcript.create({
            data: {
                title: attachment.name,
                content: attachment.content || '',
                patientId: patient.id,
                providerId: userId,
            },
        });

        await this.linkTranscriptToSession(transcript.id, sessionId);

        return transcript;
    }
}

export const chatRepository = new ChatRepository();
