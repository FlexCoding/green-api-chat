import { FC } from 'react';

import { Button, Flex } from 'antd';
import { useTranslation } from 'react-i18next';

import AuthorizationStatus from 'components/instance-auth/authorization-status.component';
import ChatList from 'components/shared/chat-list/chat-list.component';
import { useActions, useAppSelector } from 'hooks';
import { useInstanceSettings } from 'hooks/use-instance-settings.hook';
import { selectType } from 'store/slices/chat.slice';
import {
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
        {/* "Start new chat" is blocked in our embed: a rep may only message contacts that
            reach the list through the middleware's opportunity filter. */}
      </Flex>
      {(isAuthorizedInstanceState(settings?.stateInstance) ||
        settings?.stateInstance === StateInstanceEnum.Suspended ||
        isLastMessagesSyncingAfterAuthorization) && (
        <ChatList
          key={`${instanceCredentials?.idInstance}-${archived}`}
          archived={archived}
        />
      )}
    </Flex>
  );
};

export default Chats;
