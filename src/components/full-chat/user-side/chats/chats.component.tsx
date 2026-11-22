import { FC, useState } from 'react';

import { UserAddOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import { useTranslation } from 'react-i18next';

import AddNewChat from './add-new-chat.component';
import AuthorizationStatus from 'components/instance-auth/authorization-status.component';
import ChatList from 'components/shared/chat-list/chat-list.component';
import { useActions, useAppSelector } from 'hooks';
import { useInstanceSettings } from 'hooks/use-instance-settings.hook';
import { selectType } from 'store/slices/chat.slice';
import {
  selectCanViewAllChats,
  selectInstance,
  selectIsLastMessagesSyncingAfterAuthorization,
} from 'store/slices/instances.slice';
import { StateInstanceEnum } from 'types';
import { isAuthorizedInstanceState } from 'utils';

interface ChatsProps {
  // The archive folder (aside item 'archive'): same list, archived chats only.
  archived?: boolean;
}

const Chats: FC<ChatsProps> = ({ archived = false }) => {
  const type = useAppSelector(selectType);
  const instanceCredentials = useAppSelector(selectInstance);
  const isLastMessagesSyncingAfterAuthorization = useAppSelector(
    selectIsLastMessagesSyncingAfterAuthorization
  );
  const { setIsAuthorizingInstance } = useActions();

  const { t } = useTranslation();

  const { settings } = useInstanceSettings();

  // "New chat" by phone number only for users with "show all chats" (the
  // middleware's getGreen flag; the middleware also refuses checkWhatsapp
  // without it). Everyone else may only message chats that reach the list
  // through the opportunity filter. HF-00024 item ד.
  const canViewAllChats = useAppSelector(selectCanViewAllChats);
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);
  const needToRenderNewChatBtn =
    canViewAllChats &&
    !archived &&
    isAuthorizedInstanceState(settings?.stateInstance) &&
    type !== 'instance-view-page' &&
    type !== 'one-chat-only';

  return (
    <Flex className="chats" vertical>
      <Flex
        align="center"
        gap={8}
        style={{ padding: '6px 20px' }}
        justify={type === 'mobile-mode' ? 'end' : 'space-between'}
      >
        {type !== 'mobile-mode' && (
          <Flex gap={20} align="center">
            <p style={{ fontSize: '1.5rem' }}>{t(archived ? 'ARCHIVE_TITLE' : 'CHAT_HEADER')}</p>
            <AuthorizationStatus />
            {settings?.stateInstance === StateInstanceEnum.NotAuthorized &&
              !isLastMessagesSyncingAfterAuthorization && (
                <Button variant="outlined" onClick={() => setIsAuthorizingInstance(true)}>
                  {t('AUTHORIZE')}
                </Button>
              )}
          </Flex>
        )}
        {needToRenderNewChatBtn && (
          <Button
            type="text"
            shape="circle"
            onClick={() => setIsNewChatVisible(true)}
            title={t('ADD_NEW_CHAT_HEADER')}
            aria-label={t('ADD_NEW_CHAT_HEADER')}
            icon={<UserAddOutlined style={{ fontSize: 20 }} />}
          />
        )}
      </Flex>
      {(isAuthorizedInstanceState(settings?.stateInstance) ||
        settings?.stateInstance === StateInstanceEnum.Suspended ||
        isLastMessagesSyncingAfterAuthorization) && (
        <ChatList
          key={`${instanceCredentials?.idInstance}-${archived}`}
          archived={archived}
        />
      )}
      {needToRenderNewChatBtn && (
        <AddNewChat isVisible={isNewChatVisible} setIsVisible={setIsNewChatVisible} />
      )}
    </Flex>
  );
};

export default Chats;
