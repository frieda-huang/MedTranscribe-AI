import { streamText } from 'ai';
import { ChatRequest } from '@/types/chat';
import { MessageRole } from '@/lib/repository/dto';
import { chatRepository } from '@/lib/repository/implementations/chat-repository';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getTextContent } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import {
    enhancePromptWithMemories,
    storeCriticalMessages,
} from '@/lib/memory/mem0-client';

const DEFAULT_USER_ID = 'test-user-1';

/**
 * Returns an existing session ID or creates a new one.
 */
async function getValidSessionId(
    clientSessionId: string | undefined,
    firstMessageContent: string
): Promise<string> {
    if (clientSessionId) {
        const existing = await chatRepository.getSession(clientSessionId);
        if (existing) return existing.id;
    }
    const session = await chatRepository.createSession({
        userId: DEFAULT_USER_ID,
        title: firstMessageContent.slice(0, 20) || 'New Chat',
    });
    return session.id;
}

/**
 * Decodes base64 text from a data URL for each attachment.
 */
function processAttachments(attachments: any[]): any[] {
    const base64Prefix = 'data:text/plain;base64,';
    return attachments.map((attachment) => {
        if (!attachment.url?.startsWith(base64Prefix)) {
            throw new Error('Invalid data URL format');
        }
        const base64Data = attachment.url.slice(base64Prefix.length);
        if (!base64Data) {
            throw new Error('No base64 data found in URL');
        }
        const decodedText = Buffer.from(base64Data, 'base64').toString('utf-8');
        return { ...attachment, content: decodedText };
    });
}

/**
 * Saves the user's message and any transcript attachments.
 */
async function saveUserMessages(
    messages: any[],
    validSessionId: string,
    processedAttachments: any[]
): Promise<void> {
    const lastMessage = messages[messages.length - 1];
    await chatRepository.saveMessage({
        content: getTextContent(lastMessage.content),
        role: MessageRole.USER,
        sessionId: validSessionId,
        attachments: processedAttachments,
    });
    for (const attachment of processedAttachments) {
        if (attachment.contentType === 'text/plain') {
            console.log('Processing transcript file:', attachment.name);
            await chatRepository.saveTranscriptFile(
                attachment,
                validSessionId,
                DEFAULT_USER_ID
            );
        }
    }
}

/**
 * Creates a TransformStream that accumulates the AI response and saves it.
 */
function createResponseTransformStream(
    validSessionId: string
): TransformStream {
    let fullResponse = '';
    return new TransformStream({
        transform(chunk, controller) {
            const text = new TextDecoder().decode(chunk);
            fullResponse += text;
            controller.enqueue(chunk);
        },
        flush() {
            chatRepository
                .saveMessage({
                    content: fullResponse,
                    role: MessageRole.ASSISTANT,
                    sessionId: validSessionId,
                })
                .catch((err) =>
                    console.error('Failed to save AI response:', err)
                );
        },
    });
}

/**
 * Parses and validates the incoming request.
 */
async function parseRequest(req: Request): Promise<{
    messages: any[];
    model: string;
    clientSessionId?: string;
}> {
    const {
        messages,
        model,
        sessionId: clientSessionId,
    } = (await req.json()) as ChatRequest & { sessionId?: string };
    if (!messages || messages.length === 0) {
        throw new Error('No messages provided');
    }
    return { messages, model, clientSessionId };
}

/**
 * Processes attachments from the last message.
 */
function processAttachmentsFromMessages(messages: any[]): any[] {
    const lastMessage = messages[messages.length - 1];
    const rawAttachments = lastMessage.experimental_attachments || [];
    return processAttachments(rawAttachments);
}

/**
 * Ensures we have a valid session ID, using the first message's content.
 */
async function ensureSessionId(
    messages: any[],
    clientSessionId?: string
): Promise<string> {
    const firstMessageContent = messages[0]?.content
        ? getTextContent(messages[0].content)
        : '';
    return await getValidSessionId(clientSessionId, firstMessageContent);
}

/**
 * Augments the conversation messages with memory-enhanced content.
 * This function deep clones the original messages, finds the last user message,
 * enhances its content with relevant memories, and returns the updated array.
 */
async function augmentMessagesWithMemory(messages: any[]): Promise<any[]> {
    // Deep clone the messages to avoid side effects
    const augmentedMessages = JSON.parse(JSON.stringify(messages));

    // Find the last user message to enhance with memory
    const lastUserMessageIndex = augmentedMessages.findLastIndex(
        (m: any) => m.role === 'user'
    );

    if (lastUserMessageIndex >= 0) {
        // Extract original content and enhance it with memory context
        const originalContent = getTextContent(
            augmentedMessages[lastUserMessageIndex].content
        );
        const enhancedContent = await enhancePromptWithMemories(
            originalContent,
            DEFAULT_USER_ID
        );
        augmentedMessages[lastUserMessageIndex].content = enhancedContent;
    }

    return augmentedMessages;
}

/**
 * Handles the AI response streaming and returns the final Response.
 *
 * This function augments the conversation messages with memory,
 * calls the LLM to generate the response, and pipes the response stream
 * through a transform stream that saves the assistant's output.
 */
async function handleLLMResponse(
    model: string,
    messages: any[],
    validSessionId: string
): Promise<Response> {
    const augmentedMessages = await augmentMessagesWithMemory(messages);
    const result = streamText({
        model: google('gemini-1.5-pro-latest'),
        system: SYSTEM_PROMPT,
        messages: augmentedMessages,
    });

    // Create a transform stream to accumulate and save the AI's response.
    const transformStream = createResponseTransformStream(validSessionId);
    const responseStream = result.toDataStreamResponse({
        sendReasoning: false,
    });

    storeCriticalMessages(DEFAULT_USER_ID, messages);

    // Set response headers (e.g. session ID) and return the response.
    const headers = new Headers();
    headers.set('x-session-id', validSessionId);
    return new Response(responseStream.body?.pipeThrough(transformStream), {
        headers,
    });
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { messages, model, clientSessionId } = await parseRequest(req);
        const processedAttachments = processAttachmentsFromMessages(messages);
        const validSessionId = await ensureSessionId(messages, clientSessionId);
        await saveUserMessages(messages, validSessionId, processedAttachments);
        return await handleLLMResponse(model, messages, validSessionId);
    } catch (error) {
        console.error('Error in chat API:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to process request' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
