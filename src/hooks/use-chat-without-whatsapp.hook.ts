import { useAppSelector } from 'hooks/redux.hook';
import { useCheckWhatsappForChatQuery } from 'services/green-api/endpoints';
import type { RootState } from 'store';
import { selectInstance, selectTypeInstance } from 'store/slices/instances.slice';
import { GetChatHistoryParametersInterface, MessageInterface } from 'types';
import { isWhatsAppOfficialChat } from 'utils';

// What the already-loaded data says about a chat, as a number so the selector result is
// stable (no re-render on every dispatch):
const HISTORY_PENDING = 0; // its chat history is still loading
const NO_INCOMING = 1; // history loaded, no message from the other side
const HAS_INCOMING = 2; // they wrote to us, so the number has WhatsApp

const isPrivateWhatsappChatId = (chatId: string | undefined): chatId is string =>
  !!chatId && /^\d+@c\.us$/.test(chatId) && !isWhatsAppOfficialChat(chatId);

const selectChatEvidence = (state: RootState, chatId: string): number => {
  let historySettled = false;

  for (const query of Object.values(state.greenAPI.queries)) {
    if (!query) continue;
    if (query.endpointName !== 'getChatHistory' && query.endpointName !== 'lastMessages') continue;

    if (
      query.endpointName === 'getChatHistory' &&
      (query.originalArgs as Partial<GetChatHistoryParametersInterface>)?.chatId === chatId &&
      // loaded once (data stays while a poll refetches) or failed
      (query.data !== undefined || query.status === 'rejected')
    ) {
      historySettled = true;
    }

    if (
      Array.isArray(query.data) &&
      (query.data as MessageInterface[]).some(
        (message) => message?.chatId === chatId && message.type === 'incoming'
      )
    ) {
      return HAS_INCOMING;
    }
  }

  return historySettled ? NO_INCOMING : HISTORY_PENDING;
};

// HF-00024 item 3: WhatsApp itself refuses a chat with a number that has no WhatsApp
// (e.g. kosher phones); Green would accept the send and nothing would arrive. For the
// open private WhatsApp chat, ask checkWhatsapp once per number - only after its history
// loaded and showed no incoming message (an incoming message already proves WhatsApp,
// which saves the call on almost every chat). True only on a definite "no": an error,
// a refused check (403) or a used-up quota (466) never blocks sending.
export const useChatWithoutWhatsapp = (chatId: string | undefined): boolean => {
  const instanceCredentials = useAppSelector(selectInstance);
  const typeInstance = useAppSelector(selectTypeInstance);

  const isPrivateWhatsappChat = typeInstance === 'whatsapp' && isPrivateWhatsappChatId(chatId);

  const evidence = useAppSelector((state: RootState) =>
    isPrivateWhatsappChat ? selectChatEvidence(state, chatId as string) : HAS_INCOMING
  );

  const { data } = useCheckWhatsappForChatQuery(
    { ...instanceCredentials, phoneNumber: isPrivateWhatsappChat ? chatId.split('@')[0] : '' },
    {
      skip:
        !isPrivateWhatsappChat ||
        evidence !== NO_INCOMING ||
        !instanceCredentials?.idInstance ||
        !instanceCredentials?.sessionId,
    }
  );

  return isPrivateWhatsappChat && evidence === NO_INCOMING && data?.existsWhatsapp === false;
};
