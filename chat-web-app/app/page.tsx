'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

import { Chat } from '@/components/ui/chat';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const MODELS = [
    { id: 'gemma3', name: 'Gemma 3' },
    { id: 'deepseek-r1:8b', name: 'Deepseek R1 8B' },
];

export default function Home() {
    const initialSessionId =
        typeof window !== 'undefined'
            ? localStorage.getItem('chatSessionId')
            : null;

    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [sessionId, setSessionId] = useState<string | null>(initialSessionId);

    function updateSessionId(newSessionId: string) {
        setSessionId(newSessionId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('chatSessionId', newSessionId);
        }
    }

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        append,
        stop,
        status,
        setMessages,
    } = useChat({
        body: {
            model: selectedModel,
            sessionId: sessionId,
        },
        onResponse: (response) => {
            // Extract session ID from response headers
            const newSessionId = response.headers.get('x-session-id');
            if (newSessionId && newSessionId !== 'temp-session-id') {
                updateSessionId(newSessionId);
            }
        },
    });

    const isGenerating = status === 'streaming';

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl h-screen flex flex-col">
            <div className="flex justify-end mb-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                        {MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                {model.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Chat
                className="grow"
                messages={messages}
                handleSubmit={handleSubmit}
                input={input}
                handleInputChange={handleInputChange}
                isGenerating={isGenerating}
                stop={stop}
                append={append}
                setMessages={setMessages}
                suggestions={[
                    'Summarize the key medical concerns from this transcript',
                    'What medications is the patient currently taking?',
                    'Extract the vital signs and lab results mentioned in this transcript',
                ]}
            />
        </div>
    );
}
