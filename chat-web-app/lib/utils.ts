import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { google } from '@ai-sdk/google';
import { EXTRACT_PATIENT_INFO_PROMPT } from '@/lib/ai/prompts';
import { generateText } from 'ai';

// Utility to merge Tailwind class names.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Type definition for patient information.
 */
export interface PatientInfo {
    name: string;
    dateOfBirth?: Date;
    medicalId?: string;
}

/**
 * Uses LLM to extract patient information from transcript content.
 * Uses only the first 2000 characters of the transcript for efficiency.
 */
export async function extractPatientInfoFromTranscript(
    content: string
): Promise<PatientInfo> {
    try {
        const transcriptExcerpt = content.substring(0, 2000);
        const { text } = await generateText({
            model: google('gemini-1.5-pro-latest'),
            system: EXTRACT_PATIENT_INFO_PROMPT,
            prompt: transcriptExcerpt,
        });
        return parsePatientInfoResponse(text);
    } catch (error) {
        console.error('Error using LLM for patient info extraction:', error);
        return generateDefaultPatientInfo();
    }
}

/**
 * Parses the JSON response from the LLM and converts it into a PatientInfo object.
 */
function parsePatientInfoResponse(responseText: string): PatientInfo {
    try {
        // Extract the JSON content from potential markdown code blocks
        let jsonText = responseText;

        // Check if the response is wrapped in markdown code blocks
        const codeBlockMatch = responseText.match(
            /```(?:json)?\s*([\s\S]*?)\s*```/
        );
        if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1];
        }

        const parsed = JSON.parse(jsonText);
        return {
            name: parsed.name || 'Unknown Patient',
            dateOfBirth: parseDate(parsed.dateOfBirth),
            medicalId: parsed.medicalId || undefined,
        };
    } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        console.error('Raw response:', responseText);
        return generateDefaultPatientInfo();
    }
}

/**
 * Converts a date string into a Date object.
 * Returns undefined if the string is missing or invalid.
 */
function parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;
    try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? undefined : date;
    } catch (e) {
        console.error('Error parsing date of birth:', e);
        return undefined;
    }
}

/**
 * Generates default patient information when extraction fails.
 * A unique medicalId is created based on the current timestamp.
 */
export function generateDefaultPatientInfo(): PatientInfo {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .substring(0, 12);
    return {
        name: 'Unknown Patient',
        medicalId: `P${timestamp}`,
    };
}

/**
 * Extract text from a message's content.
 */
export function getTextContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const textParts = content
            .filter((part: any) => part.type === 'text' || !part.type)
            .map((part: any) => part.text || part.content || '')
            .filter(Boolean);
        if (textParts.length > 0) return textParts.join(' ');
    }
    return '';
}
