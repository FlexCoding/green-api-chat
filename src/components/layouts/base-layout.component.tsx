import { FC, useEffect, useLayoutEffect, useState } from 'react';

import { Layout, message, Modal } from 'antd';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import emptyAvatar from '../../assets/emptyAvatar.svg';
import emptyAvatarButAvailable from 'assets/emptyAvatarButAvailable.svg';
import emptyAvatarGroup from 'assets/emptyAvatarGroup.png';
import FullChat from 'components/full-chat/chat.component';
import MiniChat from 'components/mini-chat/chat.component';
import { useActions, useAppSelector } from 'hooks';
import { useIsMaxInstance } from 'hooks/use-is-max-instance';
import {
  useLazyGetAvatarQuery,
  useLazyGetContactInfoQuery,
  useLazyGetGreenCredentialsQuery,
  useLazyGetGroupDataQuery,
} from 'services/green-api/endpoints';
import { setMiddlewareGroupKey } from 'services/green-api/green-api.service';
import { selectMiniVersion, selectType } from 'store/slices/chat.slice';
import { selectInstance, selectInstanceList } from 'store/slices/instances.slice';
import { selectUser } from 'store/slices/user.slice';
import { MessageEventTypeEnum, TariffsEnum } from 'types';
import {
  isAuth,
  isPartnerChat,
  isValidChatType,
  isConsoleMessageData,
  getIsChatWorkingFromStorage,
  isPageInIframe,
  getErrorMessage,
  getPhoneNumberFromChatId,
  isHappyflow,
} from 'utils';

const BaseLayout: FC = () => {
  const isMiniVersion = useAppSelector(selectMiniVersion);
  const type = useAppSelector(selectType);
  const user = useAppSelector(selectUser);
  const selectedInstance = useAppSelector(selectInstance);
  const instanceList = useAppSelector(selectInstanceList);
  const [isEventAdded, setIsEventAdded] = useState(false);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const isMax = useIsMaxInstance();
  const [isThemeSet, setIsThemeSet] = useState(false);

  const {
    setType,
    setSelectedInstance,
    setBrandData,
    setTheme,
    login,
    setPlatform,
    setActiveChat,
    setInstanceList,
  } = useActions();

  const [getContactInfo] = useLazyGetContactInfoQuery();
  const [getGroupData] = useLazyGetGroupDataQuery();
  const [getAvatar] = useLazyGetAvatarQuery();
  const [getGreenCredentials] = useLazyGetGreenCredentialsQuery();

  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: MessageEventTypeEnum.IFRAME_READY,
        },
        '*'
      );
    }
  }, []);


  const handleChatId = async (chatId: string | null) => {
    if (chatId) {
      setType('one-chat-only');
      let contactInfo = undefined;
      let groupInfo = undefined;
      let avatar = chatId.includes('g.us') ? emptyAvatarGroup : emptyAvatarButAvailable;
      let fetchError = undefined;

      if (
        (chatId.includes('g.us') || chatId.startsWith('-')) &&
        !selectedInstance.idInstance.toString().startsWith('7835')
      ) {
        const { data: groupData, error: groupDataError } = await getGroupData({
          ...(isMax ? { chatId } : { groupId: chatId }),
          // apiUrl: selectedInstance.apiUrl,
          // mediaUrl: selectedInstance.mediaUrl,
          // apiTokenInstance: selectedInstance.apiTokenInstance,
          idInstance: selectedInstance.idInstance,
          instanceUrl: selectedInstance.instanceUrl,
          sessionId: selectedInstance.sessionId,
          orgId: selectedInstance.orgId,
        });

        if (groupData && groupData !== 'Error: item-not-found') groupInfo = groupData;
        fetchError = groupDataError;

        const { data: avatarData } = await getAvatar({
          chatId,
          // apiUrl: selectedInstance.apiUrl,
          // mediaUrl: selectedInstance.mediaUrl,
          // apiTokenInstance: selectedInstance.apiTokenInstance,
          idInstance: selectedInstance.idInstance,
          instanceUrl: selectedInstance.instanceUrl,
          sessionId: selectedInstance.sessionId,
          orgId: selectedInstance.orgId,
        });

        if (avatarData) {
          avatar = avatarData.urlAvatar;
          if (!avatarData.available && !chatId.includes('g.us')) avatar = emptyAvatar;
        }
      }

      if (!chatId.includes('g.us') && !selectedInstance.idInstance.toString().startsWith('7835')) {
        const { data: contactData, error: contactInfoError } = await getContactInfo({
          chatId,
          // apiUrl: selectedInstance.apiUrl,
          // mediaUrl: selectedInstance.mediaUrl,
          // apiTokenInstance: selectedInstance.apiTokenInstance,
          idInstance: selectedInstance.idInstance,
          instanceUrl: selectedInstance.instanceUrl,
          sessionId: selectedInstance.sessionId,
          orgId: selectedInstance.orgId,
        });

        contactInfo = contactData;
        if (contactInfo?.avatar) avatar = contactInfo.avatar;
        fetchError = contactInfoError;
      }

      if (fetchError) {
        message.error(getErrorMessage(fetchError, t), 0);
        return;
      }

      const senderName =
        (typeof groupInfo === 'object' &&
          groupInfo !== null &&
          'subject' in groupInfo &&
          groupInfo.subject) ||
        contactInfo?.contactName ||
        contactInfo?.name ||
        getPhoneNumberFromChatId(chatId);

      setActiveChat({
        chatId,
        senderName,
        avatar,
        contactInfo: groupInfo || contactInfo,
      });
    }
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isConsoleMessageData(event.data)) return;
      switch (event.data.type) {
        case MessageEventTypeEnum.INIT:
          if (event.data.payload) {
            console.log('handleMessage', event);
            let isChatWorking: boolean | null = null;

            if (
              event.data.payload.idInstance &&
              event.data.payload.tariff === TariffsEnum.Developer
            ) {
              isChatWorking = getIsChatWorkingFromStorage(event.data.payload.idInstance);
            }

            setInstanceList(event.data.payload.instanceList);
            setSelectedInstance({
              idInstance: event.data.payload.idInstance,
              instanceUrl: event.data.payload.instanceUrl,
              orgId: event.data.payload.orgId,
              sessionId: event.data.payload.sessionId,
              // apiTokenInstance: event.data.payload.apiTokenInstance,
              // apiUrl: event.data.payload.apiUrl,
              // mediaUrl: event.data.payload.mediaUrl,
              
              tariff: event.data.payload.tariff,
              isChatWorking: isChatWorking,
              typeInstance: event.data.payload.typeInstance,
            });
            setIsEventAdded(true);

            login({
              login: event.data.payload.login,
              idUser: event.data.payload.idUser,
              apiTokenUser: event.data.payload.apiTokenUser,
              remember: true,
              projectId: event.data.payload.projectId,
            });

            setPlatform(event.data.payload.platform);
            setTheme(event.data.payload.theme);

            return i18n.changeLanguage(event.data.payload.locale);
          }
          return;

        case MessageEventTypeEnum.SET_CREDENTIALS:
          console.log('handleMessage', event);
          return setSelectedInstance(event.data.payload);

        case MessageEventTypeEnum.LOCALE_CHANGE:
          return i18n.changeLanguage(event.data.payload.locale);

        case MessageEventTypeEnum.SET_THEME:
          setIsThemeSet(true);
          setTheme(event.data.payload.theme);
          return;

        case MessageEventTypeEnum.SET_CHAT_ID:
          console.log('handle Change ChatId Message', event);
          return handleChatId(event.data.payload);

        default:
          return;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!selectedInstance?.idInstance && Array.isArray(instanceList) && instanceList.length > 0) {
      const firstInstance = instanceList[0];
      setSelectedInstance({
        idInstance: firstInstance.idInstance,
        instanceUrl: firstInstance.instanceUrl,
        sessionId: firstInstance.sessionId,
        orgId: firstInstance.orgId,
        // apiTokenInstance: firstInstance.apiTokenInstance,
        // apiUrl: firstInstance.apiUrl,
        // mediaUrl: firstInstance.mediaUrl,

        tariff: firstInstance.tariff,
        typeInstance: firstInstance.typeInstance,
        isChatWorking: getIsChatWorkingFromStorage(firstInstance.idInstance),
      });
    }
  }, [instanceList, selectedInstance, setSelectedInstance]);

  useLayoutEffect(() => {
    if (searchParams.has('type')) {
      const chatType = searchParams.get('type');
      if (chatType && isValidChatType(chatType)) {
        setType(chatType);
      }
    }

    // if (isPartnerChat(searchParams)) {
    //   const idInstance = searchParams.get('idInstance');
    //   const apiTokenInstance = searchParams.get('apiTokenInstance');
    //   const apiUrl = searchParams.get('apiUrl');
    //   const mediaUrl = searchParams.get('mediaUrl');
    //   // const ownerId = searchParams.get('ownerId');
    //   // const orgId = searchParams.get('orgId');

    //   if (!idInstance || !apiTokenInstance || !apiUrl || !mediaUrl) return;

    //   const language = searchParams.get('lng');
    //   const brandDescription = searchParams.get('dsc');
    //   const brandImageUrl = searchParams.get('logo');
    //   // const oppId = searchParams.get('oppId');

    //   setType('partner-iframe');
    //   setSelectedInstance({
    //     idInstance: +idInstance,
    //     apiTokenInstance,
    //     apiUrl: apiUrl + '/',
    //     mediaUrl: mediaUrl + '/',
    //     tariff: TariffsEnum.Business,
    //     typeInstance: 'whatsapp',
    //     // ownerId,
    //     // orgId,
    //     // oppId: oppId ? oppId : undefined,
    //   });

    //   language && i18n.changeLanguage(language);
    //   brandDescription && setBrandData({ description: brandDescription });
    //   brandImageUrl && setBrandData({ brandImageUrl });

    //   if (searchParams.has('chatId')) {
    //     // setType('one-chat-only');
    //     const chatId = searchParams.get('chatId');
    //     handleChatId(chatId);
    //   }
    // }
    if (isHappyflow(searchParams)) {
      const instanceUrl = searchParams.get('instanceUrl');
      const sessionId = searchParams.get('sessionId');
      const orgId = searchParams.get('orgId');
      const ownerId = searchParams.get('ownerId');
      // Group routing: the key rides on every middleware request from here on.
      setMiddlewareGroupKey(searchParams.get('groupKey'));

      if (!instanceUrl || !sessionId || !orgId || !ownerId) return;

      const language = searchParams.get('lng');
      const brandDescription = searchParams.get('dsc');
      const brandImageUrl = searchParams.get('logo');

      (async () => {
        const { data: credentials, error: credentialsError } = await getGreenCredentials({
          instanceUrl,
          sessionId,
          orgId,
          // ownerId,
        });

        if (credentialsError || !credentials) {
          const err = credentialsError as { status?: number; data?: { error?: string } } | undefined;
          if (err?.status === 403 && err?.data?.error === 'NO_GROUP') {
            // Multi-number org and this user belongs to no WhatsApp group —
            // deliberate block (never guess a number), persistent message.
            Modal.error({
              title: t('NO_GROUP_TITLE'),
              content: t('NO_GROUP_ERROR'),
              okButtonProps: { style: { display: 'none' } },
              closable: false,
            });
            return;
          }
          message.error(t('FETCH_ERROR'));
          return;
        }

        const { idInstance } = credentials;

        if (!idInstance) {
          message.error(t('UNKNOWN_ERROR'));
          return;
        }
        // console.log('sessionId:', sessionId);
        // console.log('selectedInstance.sessionId:', selectedInstance.sessionId);
        // console.log('diffrent session:', (selectedInstance.sessionId !== sessionId));
        // console.log('type:', type);
        setType('partner-iframe');
        // if (!selectedInstance?.sessionId || selectedInstance?.sessionId !== sessionId) {
          setSelectedInstance({
            idInstance: +idInstance,
            // apiTokenInstance,
            // apiUrl: apiUrl.endsWith('/') ? apiUrl : apiUrl + '/',
            // mediaUrl: mediaUrl.endsWith('/') ? mediaUrl : mediaUrl + '/',
            tariff: TariffsEnum.Business,
            typeInstance: 'whatsapp',
            instanceUrl,
            sessionId,
            orgId,
            ownerId,

          });
        // }
        language && i18n.changeLanguage(language);
        brandDescription && setBrandData({ description: brandDescription });
        brandImageUrl && setBrandData({ brandImageUrl });

        if (searchParams.has('chatId')) {
          // setType('one-chat-only');
          const chatId = searchParams.get('chatId');
          handleChatId(chatId);
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    const isNotAuthorized = !isAuth(user);
    const isNotPartner = !isPartnerChat(searchParams);
    const isNotIframe = !isPageInIframe();
    const isNotHappyflow = !isHappyflow(searchParams);

    const shouldThrowOnMini = isNotAuthorized && !isMiniVersion && isNotPartner && isEventAdded;
    const shouldThrowOnTab = isNotAuthorized && isNotPartner && isNotIframe && isNotHappyflow && type === 'tab';

    if (shouldThrowOnMini || shouldThrowOnTab) {
      throw new Error('NO_INSTANCE_CREDENTIALS');
    }
  }, [user, isMiniVersion, searchParams, isEventAdded, type]);

  if (!isThemeSet && type != 'partner-iframe' && type != 'one-chat-only') return null;

  return (
    <Layout className={`app ${!isMiniVersion ? 'bg' : ''}`}>
      <Layout.Content className={`main ${!isMiniVersion ? 'flex-center' : ''}`}>
        {isMiniVersion ? <MiniChat /> : <FullChat />}
      </Layout.Content>
    </Layout>
  );
};

export default BaseLayout;
