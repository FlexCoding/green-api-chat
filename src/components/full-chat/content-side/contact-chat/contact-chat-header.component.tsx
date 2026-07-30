import { FC, useMemo } from 'react';

import { CloseOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { Header } from 'antd/es/layout/layout';

import OpportunityIcon from 'assets/opportunity.svg?react';
import waChatIcon from 'assets/wa-chat.svg';
import AvatarImage from 'components/UI/avatar-image.component';
import { useActions, useAppSelector } from 'hooks';
import { selectActiveChat, selectMiniVersion, selectType } from 'store/slices/chat.slice';
import { selectInstance } from 'store/slices/instances.slice';
import { useLastMessagesQuery } from 'services/green-api/endpoints';
import { ActiveChat } from 'types';
import { isWhatsAppOfficialChat } from 'utils';

const ContactChatHeader: FC = () => {
  const activeChat = useAppSelector(selectActiveChat) as ActiveChat;
  const type = useAppSelector(selectType);
  const instanceCredentials = useAppSelector(selectInstance);
  const isMiniVersion = useAppSelector(selectMiniVersion);

  const { setActiveChat, setContactInfoOpen } = useActions();

  const { data: messages } = useLastMessagesQuery(
    { ...instanceCredentials, allMessages: true },
    {
      skip: !instanceCredentials?.idInstance ,
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

  const isOfficial = isWhatsAppOfficialChat(activeChat.chatId);

  return (
    <Header className="contact-chat-header">
      <Space className="chatHeader-space">
        <Button
          type="default"
          size="large"
          icon={<OpportunityIcon style={{ width: 36, height: 36 }} />}
          disabled={!opportunityIds.length}
          onClick={handleOpenOpportunity}
          style={{ verticalAlign:'middle' }}
          className="opportunity-btn"
        />
        <Space onClick={() => setContactInfoOpen(true)}>
          <AvatarImage src={isOfficial ? waChatIcon : activeChat.avatar} size="large" />
          <h3 className="text-overflow">{isOfficial ? 'WhatsApp' : activeChat.senderName}</h3>
        </Space>
      </Space>

      <Space>
        {!isOfficial && activeChat.chatId?.includes('@c') && (
          <span className="chat-header-phone" dir="ltr">
            {activeChat.chatId?.replace(/\@.*$/, '')}
          </span>
        )}
        {type !== 'one-chat-only' && (
          <a>
            <CloseOutlined style={{ width: 13 }} onClick={() => setActiveChat(null)} />
          </a>
        )}
      </Space>
    </Header>
  );
};

export default ContactChatHeader;
