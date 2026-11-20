import { FC, useEffect, useMemo, useRef } from 'react';

import { useChatsSummary } from 'hooks/use-chats-summary.hook';
import { isPageInIframe } from 'utils';

// Tells the Salesforce host (wachat whatsAppChat LWC) how many unread incoming
// messages there are, so the utility-bar button can show "WhatsApp (3)", highlight
// and chime while the panel is minimized. Source = getChats unreadCount (WhatsApp's
// own counter, already filtered by the middleware to this user's chats); archived
// chats don't count, like in WhatsApp. Only the number leaves the iframe.
export const UNREAD_COUNT_EVENT = 'unreadCount';

const UnreadCountBridge: FC = () => {
  const { data: chats, isSuccess, archivedChatIds } = useChatsSummary();
  const lastSent = useRef<number | null>(null);

  const total = useMemo(
    () =>
      (chats ?? []).reduce(
        (sum, chat) =>
          archivedChatIds.has(chat.chatId) || typeof chat.unreadCount !== 'number'
            ? sum
            : sum + chat.unreadCount,
        0
      ),
    [chats, archivedChatIds]
  );

  useEffect(() => {
    if (!isSuccess || !isPageInIframe() || lastSent.current === total) return;
    lastSent.current = total;
    window.parent.postMessage({ event: UNREAD_COUNT_EVENT, count: total }, '*');
  }, [isSuccess, total]);

  return null;
};

export default UnreadCountBridge;
