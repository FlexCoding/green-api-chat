import { FC } from 'react';

import CantSendInChatAlert from 'components/alerts/cant-send-in-chat-alert.component';
import ChatForm from 'components/forms/chat-form.component';
import ChatView from 'components/shared/chat-view.component';
import { useAppSelector } from 'hooks';
import { useChatWithoutWhatsapp } from 'hooks/use-chat-without-whatsapp.hook';
import { selectActiveChat } from 'store/slices/chat.slice';
import { ActiveChat } from 'types';
import { isChannelChatType } from 'utils';

const ContactChat: FC = () => {
  const activeChat = useAppSelector(selectActiveChat) as ActiveChat;

  const isChannel = isChannelChatType(activeChat.chatType);
  const isForbidden = typeof activeChat.contactInfo === 'string';
  const isWithoutWhatsapp = useChatWithoutWhatsapp(activeChat.chatId);

  const renderFooter = () => {
    if (isForbidden) return <CantSendInChatAlert reason="group" />;
    if (activeChat.newChatId) return <CantSendInChatAlert reason="inactive-account" />;
    if (isWithoutWhatsapp) return <CantSendInChatAlert reason="no-whatsapp" />;
    return <ChatForm />;
  };

  return (
    <div className="chat-form-wrapper relative">
      <div className="chat-bg" />
      <ChatView />
      {!isChannel && renderFooter()}
    </div>
  );
};

export default ContactChat;
