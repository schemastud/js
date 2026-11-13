import { useMessages } from '@schemastud/messages/react';
import catalog from '../messages.default.json';

export const useFrameMessages = (): ReturnType<typeof useMessages<typeof catalog.messages>> => useMessages(catalog.messages);
