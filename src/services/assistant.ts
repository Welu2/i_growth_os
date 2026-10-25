import { api } from './cloud';
import { draftSchema, type AssistantDraft, type AssistantRequest } from '../domain/model';
export async function requestAssistant(request: AssistantRequest, signal: AbortSignal, owner: string): Promise<AssistantDraft> {
  return draftSchema.parse(await api('/assistant', request, signal, undefined, owner));
}
export function offlineDraft(request: AssistantRequest): AssistantDraft {
  const topic = request.topic.trim().slice(0, 100);
  return {
    title: `A small start: ${topic}`,
    message: request.mode === 'encouragement' ? 'You can start again with one manageable action. Progress does not have to be perfect to count.' : `Set aside ${request.minutes} minutes. Choose an exercise you can finish and reflect on what you learned.`,
    steps: [`Write down one specific question about ${topic}.`, `Practice one small part for ${Math.max(1, request.minutes - 2)} minutes.`, 'Write a short reflection and choose your next step.'],
  };
}
