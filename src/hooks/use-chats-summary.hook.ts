import { useEffect, useMemo, useState } from 'react';

import { useAppSelector } from 'hooks/redux.hook';
import { useGetChatsQuery } from 'services/green-api/endpoints';
import { selectInstance } from 'store/slices/instances.slice';

// getChats annotates the chats we already show (unread counters, "go to new chat",
// WhatsApp's own archive flag). Every caller uses these exact args, so RTK Query keeps
// ONE cache entry and one poll for the chat list, the chat header and the unread badge.
export const CHATS_SUMMARY_COUNT = 100;
export const CHATS_SUMMARY_POLLING_INTERVAL = 30000;
// After a 429 the poll backs off (doubling, capped) until a request succeeds again.
const CHATS_SUMMARY_MAX_BACKOFF = 240000;

export const useChatsSummary = () => {
  const instanceCredentials = useAppSelector(selectInstance);
  const [pollingInterval, setPollingInterval] = useState(CHATS_SUMMARY_POLLING_INTERVAL);

  // Keeps polling while the Salesforce utility panel is minimized / unfocused: the
  // unread badge on the utility bar depends on it (one request per 30s).
  const query = useGetChatsQuery(
    { ...instanceCredentials, count: CHATS_SUMMARY_COUNT },
    {
      pollingInterval,
      skip: !instanceCredentials?.idInstance || !instanceCredentials?.sessionId,
    }
  );

  const isRateLimited = !!query.error && 'status' in query.error && query.error.status === 429;

  useEffect(() => {
    if (isRateLimited) {
      setPollingInterval((prev) => Math.min(prev * 2, CHATS_SUMMARY_MAX_BACKOFF));
    } else if (query.isSuccess) {
      setPollingInterval(CHATS_SUMMARY_POLLING_INTERVAL);
    }
  }, [isRateLimited, query.isSuccess, query.requestId]);

  // Archived on the WhatsApp side (phone or our menu) - Green's getChats `archive`.
  const archivedChatIds = useMemo(() => {
    const ids = new Set<string>();
    query.data?.forEach((chat) => {
      if (chat.archive) ids.add(chat.chatId);
    });
    return ids;
  }, [query.data]);

  return { ...query, archivedChatIds };
};
