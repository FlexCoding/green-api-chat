import { FC, useEffect, useMemo, useRef, useState } from 'react';

import { Empty, Flex, List, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import ChatListItem from './chat-list-item.component';
import ChatSearchInput from './chat-search-input.component';
import { useAppSelector, useMediaQuery } from 'hooks';
import {
  useGetChatsQuery,
  useLastMessagesQuery,
  useReadChatMutation,
} from 'services/green-api/endpoints';
import {
  selectActiveChat,
  selectLastMessagesByChatId,
  selectMiniVersion,
  selectSearchQuery,
  selectType,
} from 'store/slices/chat.slice';
import { selectInstance } from 'store/slices/instances.slice';
import { MessageInterface } from 'types';
import {
  filterContacts,
  filterMessagesByText,
  getErrorMessage,
  getLastChats,
  isNotReaction,
} from 'utils';

const { Title } = Typography;

// getChats is used ONLY to annotate the chats we already show (unread badge, readChat,
// "go to new chat"). The list itself stays driven by lastIncoming/lastOutgoingMessages,
// which the middleware filters to the chats this Salesforce user may see and enriches
// with opportunityIds. Upstream's getChats-driven list (plus a per-chat getChatHistory
// sweep) would bypass that filter, drop the opportunity button, and multiply Green API
// calls, so it is deliberately not used here.
const CHATS_UNREAD_COUNT = 100;
const CHATS_UNREAD_POLLING_INTERVAL = 30000;

const ChatList: FC = () => {
  const instanceCredentials = useAppSelector(selectInstance);
  const isMiniVersion = useAppSelector(selectMiniVersion);
  const searchQuery = useAppSelector(selectSearchQuery);
  const type = useAppSelector(selectType);
  const activeChat = useAppSelector(selectActiveChat);
  const lastMessagesByChatId = useAppSelector(selectLastMessagesByChatId);

  const matchMedia = useMediaQuery('(min-height: 1200px)');

  const { t } = useTranslation();

  const [historyMinutes, setHistoryMinutes] = useState<number | undefined>(undefined);

  const { data, isLoading, error, refetch } = useLastMessagesQuery(
    { ...instanceCredentials, allMessages: true, minutesToRefetch: historyMinutes },
    {
      skipPollingIfUnfocused: true,
      pollingInterval: isMiniVersion ? 17000 : 15000,
      skip: !instanceCredentials?.idInstance,
    }
  );

  const { data: chats } = useGetChatsQuery(
    { ...instanceCredentials, count: CHATS_UNREAD_COUNT },
    {
      skipPollingIfUnfocused: true,
      pollingInterval: CHATS_UNREAD_POLLING_INTERVAL,
      skip: !instanceCredentials?.idInstance || !instanceCredentials?.sessionId,
    }
  );
  const [readChat] = useReadChatMutation();

  // Rate-limit (429) recovery. Polling alone doesn't save us here: with
  // skipPollingIfUnfocused the embedded panel is often "unfocused" so a single
  // 429 used to freeze on a bare spinner forever. Explicit retry with backoff
  // runs regardless of focus.
  const retryAttemptRef = useRef(0);
  useEffect(() => {
    if (error && 'status' in error && error.status === 429) {
      const delay = Math.min(5000 * 2 ** retryAttemptRef.current, 30000);
      retryAttemptRef.current += 1;
      const timer = setTimeout(() => refetch(), delay);
      return () => clearTimeout(timer);
    }
    if (!error) {
      retryAttemptRef.current = 0;
    }
  }, [error, refetch]);

  const chatListRef = useRef<HTMLDivElement | null>(null);

  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [contactsPage, setContactsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [initialMessageIds, setInitialMessageIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const MAX_HISTORY_MINUTES = 129600; // 90 days

  const limit = isMiniVersion ? 5 : matchMedia ? 16 : 12;

  const handleNameExtracted = (chatId: string, name: string) => {
    setContactNames((prev) => ({
      ...prev,
      [chatId]: name.toLowerCase(),
    }));
  };

  const allMessages: MessageInterface[] = useMemo(() => data ?? [], [data]);

  // Optimistic sends (upstream) write the new last message to lastMessagesByChatId.
  // Overlay it onto chats we already show, so a just-sent message appears at once —
  // only when it is newer and a different message (the polled copy wins once it
  // arrives, carrying the real delivery status). opportunityIds stay from the list.
  const lastMessages = useMemo(() => {
    const base = getLastChats(allMessages, [], isMiniVersion ? limit : undefined);

    return base
      .map((message) => {
        const optimistic = lastMessagesByChatId[message.chatId];
        if (
          optimistic &&
          optimistic.idMessage !== message.idMessage &&
          optimistic.timestamp > message.timestamp
        ) {
          return { ...optimistic, opportunityIds: message.opportunityIds };
        }
        return message;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allMessages, lastMessagesByChatId, isMiniVersion, limit]);

  const filteredContacts = filterContacts(allMessages, contactNames, searchQuery);
  const filteredMessages = filterMessagesByText(allMessages, searchQuery);

  const showResults = searchQuery.trim() !== '';

  const pagedFilteredContacts = filteredContacts.slice(0, contactsPage * limit);
  const pagedFilteredMessages = filteredMessages.slice(0, messagesPage * limit);

  // Unread counters / "go to new chat" from getChats — looked up only for chats that are
  // already in our (middleware-filtered) list.
  const apiUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    chats?.forEach((chat) => {
      if (typeof chat.unreadCount === 'number') counts[chat.chatId] = chat.unreadCount;
    });
    return counts;
  }, [chats]);

  const newChatIdByChatId = useMemo(() => {
    const map: Record<string, string> = {};
    chats?.forEach((chat) => {
      if (chat.newChatId) map[chat.chatId] = chat.newChatId;
    });
    return map;
  }, [chats]);

  useEffect(() => {
    setInitialLoaded(false);
    setInitialMessageIds(new Set());
    setUnreadCounts({});
  }, [instanceCredentials.idInstance]);

  // Session-local counter of incoming messages that arrived while the panel is open
  // (upstream shows it only for WABA instances; getChats' unreadCount wins otherwise).
  useEffect(() => {
    const loaded = allMessages.filter(isNotReaction);
    if (!loaded.length) return;

    const keyOf = (msg: MessageInterface) => msg.idMessage || `${msg.chatId}-${msg.timestamp}`;

    if (!initialLoaded) {
      setInitialMessageIds(new Set(loaded.map(keyOf)));
      setInitialLoaded(true);
      return;
    }

    const newIds = new Set(initialMessageIds);
    const newUnreadCounts: Record<string, number> = { ...unreadCounts };
    let changed = false;

    loaded
      .filter((msg) => msg.type !== 'outgoing')
      .forEach((msg) => {
        const key = keyOf(msg);
        if (!newIds.has(key)) {
          if (activeChat?.chatId !== msg.chatId) {
            newUnreadCounts[msg.chatId] = (newUnreadCounts[msg.chatId] || 0) + 1;
          }
          newIds.add(key);
          changed = true;
        }
      });

    if (changed) {
      setInitialMessageIds(newIds);
      setUnreadCounts(newUnreadCounts);
    }
  }, [allMessages, initialLoaded]);

  const clearUnreadCount = (chatId: string) => {
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
  };

  // Marks the open chat as read (blue ticks for the sender) whenever getChats reports
  // unread messages for it — right after opening it and if new ones arrive while open.
  const activeChatUnreadCount = activeChat ? apiUnreadCounts[activeChat.chatId] : undefined;

  useEffect(() => {
    if (!activeChat?.chatId || !activeChatUnreadCount) return;

    readChat({ ...instanceCredentials, chatId: activeChat.chatId });
  }, [activeChat?.chatId, activeChatUnreadCount, instanceCredentials, readChat]);

  useEffect(() => {
    if (!allMessages.length) return;

    setContactNames((prev) => {
      const updated = { ...prev };
      allMessages.forEach((msg) => {
        if (!updated[msg.chatId]) {
          updated[msg.chatId] = msg.chatId?.toLowerCase();
        }
      });
      return updated;
    });
  }, [allMessages]);

  useEffect(() => {
    const element = chatListRef.current;
    if (!element) return;

    let scrollTimer: number;

    const handleScrollBottom = () => {
      const bottomReached = element.scrollTop + element.offsetHeight + 50 >= element.scrollHeight;

      if (bottomReached) {
        clearTimeout(scrollTimer);

        if (showResults) {
          let updated = false;

          if (filteredContacts.length > contactsPage * limit) {
            scrollTimer = setTimeout(() => setContactsPage((prev) => prev + 1), 500);
            updated = true;
          }

          if (filteredMessages.length > messagesPage * limit && !updated) {
            scrollTimer = setTimeout(() => setMessagesPage((prev) => prev + 1), 500);
          }
        } else {
          if (lastMessages.length > page * limit) {
            scrollTimer = setTimeout(() => setPage((prev) => prev + 1), 500);
          } else {
            // Reached the end of locally-loaded chats — try fetching a larger history window.
            const current = historyMinutes ?? 2880;
            const next = Math.min(current * 2, MAX_HISTORY_MINUTES);
            if (next > current) {
              scrollTimer = setTimeout(() => setHistoryMinutes(next), 500);
            }
          }
        }
      }
    };

    element.addEventListener('scroll', handleScrollBottom);
    return () => {
      clearTimeout(scrollTimer);
      element.removeEventListener('scroll', handleScrollBottom);
    };
  }, [
    filteredContacts,
    filteredMessages,
    lastMessages,
    contactsPage,
    messagesPage,
    page,
    showResults,
    historyMinutes,
  ]);

  if (!instanceCredentials?.idInstance) {
    return (
      <Empty
        className={`empty p-10 ${isMiniVersion ? 'min-height-460' : 'height-720'}`}
        description={t('SELECT_INSTANCE_PLACEHOLDER')}
      />
    );
  }

  if (error) {
    if ('status' in error && error.status === 429) {
      return (
        <Flex
          className={`contact-list ${isMiniVersion ? 'min-height-460' : 'height-720'}`}
          align="center"
          justify="center"
          vertical
          gap={12}
        >
          <Spin size="large" />
          <span style={{ color: '#888' }}>{t('RATE_LIMIT_RETRY')}</span>
        </Flex>
      );
    }

    return (
      <Empty
        className={`empty p-10 ${isMiniVersion ? 'min-height-460' : 'height-720'}`}
        description={getErrorMessage(error, t)}
      />
    );
  }

  return (
    <>
      {type !== 'mobile-mode' && <ChatSearchInput setPage={setPage} />}

      <div
        ref={chatListRef}
        className={`contact-list px-2 overflow-auto ${isMiniVersion ? 'min-height-460' : 'height-720'}`}
      >
        {showResults ? (
          <>
            {pagedFilteredContacts.length > 0 && (
              <>
                <Title level={5} style={{ padding: '10px 0 0 10px' }}>
                  {t('CONTACTS')}
                </Title>
                <List
                  dataSource={pagedFilteredContacts}
                  renderItem={(msg) => (
                    <ChatListItem
                      key={msg.chatId}
                      lastMessage={msg}
                      onNameExtracted={handleNameExtracted}
                      showDescription={false}
                      newChatId={newChatIdByChatId[msg.chatId]}
                    />
                  )}
                  split={false}
                />
              </>
            )}

            {pagedFilteredMessages.length > 0 && (
              <>
                <Title level={5} style={{ padding: '10px 0 0 10px' }}>
                  {t('MESSAGES')}
                </Title>
                <List
                  dataSource={pagedFilteredMessages}
                  renderItem={(msg) => (
                    <ChatListItem
                      key={`${msg.chatId}-${msg.idMessage}`}
                      lastMessage={msg}
                      onNameExtracted={handleNameExtracted}
                      unreadCount={unreadCounts[msg.chatId]}
                      apiUnreadCount={apiUnreadCounts[msg.chatId]}
                      newChatId={newChatIdByChatId[msg.chatId]}
                      onClearUnread={() => clearUnreadCount(msg.chatId)}
                    />
                  )}
                  split={false}
                />
              </>
            )}

            {pagedFilteredContacts.length === 0 && pagedFilteredMessages.length === 0 && (
              <Empty
                className="empty mt-10"
                description={t('NOTHING_FOUND') || 'Ничего не найдено'}
              />
            )}
          </>
        ) : (
          <List
            dataSource={lastMessages.slice(0, page * limit)}
            renderItem={(message) => (
              <ChatListItem
                key={message.chatId}
                lastMessage={message}
                onNameExtracted={handleNameExtracted}
                unreadCount={unreadCounts[message.chatId]}
                apiUnreadCount={apiUnreadCounts[message.chatId]}
                newChatId={newChatIdByChatId[message.chatId]}
                onClearUnread={() => clearUnreadCount(message.chatId)}
              />
            )}
            loading={{
              // Spin only while a fetch is actually in flight. `!data?.length` kept
              // the spinner on FOREVER in a fresh org with zero chats, hiding the
              // EMPTY_CHAT_LIST empty-state below.
              spinning: isLoading || data === undefined,
              className: `${isMiniVersion ? 'min-height-460' : 'height-720'}`,
              size: 'large',
            }}
            locale={{
              emptyText: <Empty className="empty p-10" description={t('EMPTY_CHAT_LIST')} />,
            }}
          />
        )}
      </div>
    </>
  );
};

export default ChatList;
