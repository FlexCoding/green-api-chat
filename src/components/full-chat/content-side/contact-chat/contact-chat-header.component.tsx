import { FC, useMemo } from 'react';

import { CloseOutlined, LeftOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { useTranslation } from 'react-i18next';

import waChatIcon from 'assets/messenger-logo/wa-chat.svg';
import OpportunityIcon from 'assets/opportunity.svg?react';
import CallButton from 'components/shared/call-button.component';
import AvatarImage from 'components/UI/avatar-image.component';
import { FULL_CHAT_HISTORY_COUNT } from 'configs';
import { useActions, useAppSelector, useMediaQuery } from 'hooks';
import {
  useGetChatHistoryQuery,
  useGetChatsQuery,
  useLastMessagesQuery,
} from 'services/green-api/endpoints';
import { selectActiveChat, selectType } from 'store/slices/chat.slice';
import { selectInstance, selectTypeInstance } from 'store/slices/instances.slice';
import { ActiveChat } from 'types';
import {
  formatPhoneNumber,
  getFirstNonEmptyString,
  getPhoneNumberFromChatId,
  isBotChatType,
  isContactInfo,
  isWhatsAppOfficialChat,
} from 'utils';

const ContactChatHeader: FC = () => {
  const activeChat = useAppSelector(selectActiveChat) as ActiveChat;
  const type = useAppSelector(selectType);
  const instanceCredentials = useAppSelector(selectInstance);
  const typeInstance = useAppSelector(selectTypeInstance);
  const { t } = useTranslation();
  // Same breakpoint as content-side.component.tsx, where the chat list and the open
  // chat are shown one at a time instead of side by side.
  const isMobile = useMediaQuery('(max-width: 975px)');

  const { setActiveChat, setContactInfoOpen } = useActions();

  // opportunityIds ride on the middleware-filtered lastMessages (same cache entry as
  // the chat list, so no extra request).
  const { data: messages } = useLastMessagesQuery(
    { ...instanceCredentials, allMessages: true },
    {
      skip: !instanceCredentials?.idInstance,
    }
  );

  const opportunityIds = useMemo(() => {
    if (!messages || !activeChat?.chatId) return [];
    const chatMessage = messages.find((msg) => msg.chatId === activeChat.chatId);
    return chatMessage?.opportunityIds ?? [];
  }, [messages, activeChat?.chatId]);

  const handleOpenOpportunity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (opportunityIds[0]) {
      window.parent.postMessage(
        { event: 'openOpportunity', opportunityId: opportunityIds[0] },
        '*'
      );
    }
  };

  const isMax = typeInstance === 'v3';
  const isTelegram = typeInstance === 'telegram';
  const isGroup = activeChat.chatId?.includes('@g.us') || activeChat.chatId?.startsWith('-');
  const showCallButton =
    typeInstance === 'whatsapp' &&
    !isGroup &&
    (type === 'console-page' || type === 'instance-view-page');

  const isOfficial = isWhatsAppOfficialChat(activeChat.chatId);
  const isBotChat = isBotChatType(activeChat.chatType);
  const { data: chats } = useGetChatsQuery(instanceCredentials, {
    skip: !isTelegram || !instanceCredentials?.idInstance || !instanceCredentials?.sessionId,
  });
  const { data: chatHistory } = useGetChatHistoryQuery(
    {
      ...instanceCredentials,
      chatId: activeChat.chatId,
      // Must match the count requested by ChatView so RTK Query dedupes both hooks
      // into a single getChatHistory request instead of firing a second parallel one.
      count: FULL_CHAT_HISTORY_COUNT,
    },
    {
      skip:
        !activeChat?.chatId || !instanceCredentials?.idInstance || !instanceCredentials?.sessionId,
    }
  );
  const telegramChat = chats?.find((chat) => chat.chatId === activeChat.chatId);
  const historySenderName = chatHistory?.find((message) =>
    getFirstNonEmptyString(message.senderName, message.senderContactName)
  );
  const displayName = getFirstNonEmptyString(
    telegramChat?.name,
    activeChat.senderName,
    historySenderName?.senderContactName,
    historySenderName?.senderName,
    activeChat.chatId
  );

  const { contactInfo } = activeChat;
  const maxOrTelegramPhoneNumber =
    (isMax || isTelegram) &&
    contactInfo &&
    typeof contactInfo === 'object' &&
    isContactInfo(contactInfo, isMax) &&
    contactInfo.phoneNumber
      ? formatPhoneNumber(contactInfo.phoneNumber)
      : undefined;

  const headerPhoneNumber =
    !isOfficial && activeChat.chatId?.includes('@c')
      ? formatPhoneNumber(activeChat.chatId.replace(/\@.*$/, ''))
      : maxOrTelegramPhoneNumber;

  return (
    <Header className="contact-chat-header">
      <Flex
        className="chatHeader-space"
        align="center"
        gap={8}
        onClick={() => setContactInfoOpen(true)}
      >
        <Button
          type="default"
          size="large"
          icon={<OpportunityIcon style={{ width: 36, height: 36 }} />}
          disabled={!opportunityIds.length}
          onClick={handleOpenOpportunity}
          style={{ verticalAlign: 'middle', flexShrink: 0 }}
          className="opportunity-btn"
        />
        <div style={{ flexShrink: 0 }}>
          <AvatarImage src={isOfficial ? waChatIcon : activeChat.avatar} size="large" />
        </div>
        <Flex vertical style={{ minWidth: 0, justifyContent: 'center' }} gap={0}>
          <h3
            className="text-overflow"
            style={{ marginBottom: 0, lineHeight: 1.1 }}
            title={displayName}
            dir="auto"
          >
            {isOfficial ? 'WhatsApp' : displayName}
          </h3>
          {isBotChat && (
            <div
              className="message-signerData"
              style={{ fontSize: 12, lineHeight: '12px', marginTop: 2, opacity: 0.7 }}
            >
              {t('BOT_LABEL')}
            </div>
          )}
        </Flex>
      </Flex>

      <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
        {showCallButton && (
          <CallButton
            pendingCall={{
              chatId: activeChat.chatId,
              phone: getPhoneNumberFromChatId(activeChat.chatId),
              name: displayName,
              avatar: activeChat.avatar,
            }}
          />
        )}
        {headerPhoneNumber && (
          <span className="chat-header-phone" dir="ltr">
            {headerPhoneNumber}
          </span>
        )}
        {type !== 'one-chat-only' &&
          (isMobile ? (
            <a
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
              onClick={() => setActiveChat(null)}
            >
              <LeftOutlined style={{ fontSize: 14 }} />
              {t('BACK_TO_CHATS')}
            </a>
          ) : (
            <a>
              <CloseOutlined style={{ width: 14 }} onClick={() => setActiveChat(null)} />
            </a>
          ))}
      </Flex>
    </Header>
  );
};

export default ContactChatHeader;
