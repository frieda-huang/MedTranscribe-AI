import { getTextContent } from '@/lib/utils';
import { MessageDto } from '@/lib/repository/dto';
import MemoryClient from 'mem0ai';

const apiKey = process.env.MEM0_API_KEY;
if (!apiKey) {
    throw new Error(
        'MEM0_API_KEY is not defined. Please set it in your environment variables.'
    );
}
const memory = new MemoryClient({ apiKey });

/**
 * A simple heuristic to determine if a message contains critical information.
 * Adjust this function as needed.
 */
function isCriticalMessage(message: MessageDto): boolean {
    const content = getTextContent(message.content);
    // Consider messages longer than 50 characters that mention key terms as critical.
    const keywords = [
        'diagnosis',
        'treatment',
        'medication',
        'history',
        'symptom',
        'allergy',
    ];
    return (
        content.length > 50 &&
        keywords.some((keyword) => content.toLowerCase().includes(keyword))
    );
}

/**
 * Stores only the critical messages from the conversation into mem0.
 */
export async function storeCriticalMessages(
    userId: string,
    messages: MessageDto[]
): Promise<void> {
    for (const message of messages) {
        if (isCriticalMessage(message)) {
            try {
                await memory.add(messages, {
                    user_id: userId,
                    metadata: { category: 'critical_messages' },
                });
            } catch (err) {
                console.error(
                    `Failed to store message ${message.id} in memory:`,
                    err
                );
            }
        }
    }
}

/**
 * Retrieves relevant memories based on the current context and augments the prompt.
 */
export async function enhancePromptWithMemories(
    currentMessage: string,
    userId: string
): Promise<string> {
    const searchResult = await memory.search(currentMessage, {
        user_id: userId,
    });

    // Augment the original message with memory context
    return `${currentMessage}\n\n===RELEVANT PATIENT HISTORY===\n${searchResult}\n\nPlease consider the above patient history in your response.`;
}
