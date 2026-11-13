import { useMessages } from '@schemastud/messages/react';
import catalog from '../messages.default.json';

export const useComboboxMessages = (): ReturnType<typeof useMessages<typeof catalog.messages>> => useMessages(catalog.messages);
