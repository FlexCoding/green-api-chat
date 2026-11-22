import { FC } from 'react';

import CantSendInChatAlert from 'components/alerts/cant-send-in-chat-alert.component';
import ChatForm from 'components/forms/chat-form.component';
import { useAppSelector } from 'hooks';
import { useChatWithoutWhatsapp } from 'hooks/use-chat-without-whatsapp.hook';
import { useIsMaxInstance } from 'hooks/use-is-max-instance';
import { selectActiveChat } from 'store/slices/chat.slice';
import { ActiveChat } from 'types';
import { isChannelChatType } from 'utils';

const ContactChatFooter: FC = () => {
  const activeChat = useAppSelector(selectActiveChat) as ActiveChat;

  const isMax = useIsMaxInstance();
  const isWithoutWhatsapp = useChatWithoutWhatsapp(activeChat.chatId);

  const isNotInMaxGroup = isMax && activeChat.chatId.startsWith('-') && !activeChat.contactInfo;

  if (isChannelChatType(activeChat.chatType)) {
    return null;
  }

  if (isNotInMaxGroup || activeChat.contactInfo === 'Error: forbidden') {
    return <CantSendInChatAlert reason="group" />;
  }

  if (activeChat.newChatId) {
    return <CantSendInChatAlert reason="inactive-account" />;
  }

  if (isWithoutWhatsapp) {
    return <CantSendInChatAlert reason="no-whatsapp" />;
  }

  return <ChatForm />;
};

export default ContactChatFooter;
