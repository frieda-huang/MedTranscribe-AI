import { ollama } from 'ollama-ai-provider';

export function getOllamaModel(modelId: string = 'deepseek-r1:8b') {
    return ollama(modelId);
}
