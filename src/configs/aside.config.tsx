import { GlobalOutlined, SettingOutlined } from '@ant-design/icons';

import ArchiveIcon from 'assets/icons/archive.svg?react';
import ChatIcon from 'assets/icons/chat.svg?react';
import ContactIcon from 'assets/icons/contact-icon.svg?react';
import InstanceIcon from 'assets/icons/instance-icon.svg?react';
import Chats from 'components/full-chat/user-side/chats/chats.component';
import Contacts from 'components/full-chat/user-side/contacts/contacts.component';
import { InstanceSettings } from 'components/full-chat/user-side/settings/instance.component';
import { Language } from 'components/full-chat/user-side/settings/language.componet';
import { Logout } from 'components/full-chat/user-side/settings/logout.component';
import { Profile } from 'components/full-chat/user-side/settings/profile.component';
import { SettingsSelect } from 'components/UI/select/select-settigs.component';
import { AsideItem, ChatType, TypeInstance, UserSideItem } from 'types';

export const asideTopIconItems: (
  type: ChatType,
  typeInstance: TypeInstance,
  canViewAllChats?: boolean
) => (AsideItem | null)[] = (
  type,
  typeInstance,
  canViewAllChats = false
) => [
  type !== 'partner-iframe' && type !== 'one-chat-only'
    ? { item: 'instance', title: 'INSTANCE', icon: <InstanceIcon /> }
    : null,
  { item: 'chats', title: 'CHATS_TITLE', icon: <ChatIcon /> },
  // Archive folder (upstream's commented bottom item, moved here because it needs
  // typeInstance): WhatsApp-only, chats archived on the phone or from our chat menu.
  typeInstance === 'whatsapp' && type !== 'one-chat-only'
    ? { item: 'archive', title: 'ARCHIVE_TITLE', icon: <ArchiveIcon /> }
    : null,
  // Contacts tab (rename a chat like in WhatsApp, HF-00024 item 1): only for users with
  // "show all chats" (middleware getGreen flag). It is the instance's whole address
  // book, so it would bypass the per-user opportunity filter for anyone else - the
  // middleware refuses its methods without view-all too. WhatsApp only.
  canViewAllChats && type !== 'one-chat-only' && typeInstance === 'whatsapp'
    ? { item: 'contacts', title: 'CONTACTS', icon: <ContactIcon /> }
    : null,
  // Fork: Statuses tab stays blocked: "update status" (blocked since 31faf0e) plus every
  // contact's status feed would bypass the middleware's per-user opportunity filter.
  // typeInstance === 'whatsapp'
  //   ? { item: 'statuses', title: 'STATUSES', icon: <StatusIcon />, waOnly: true }
  //   : null,
];

export const asideBottomIconItems: AsideItem[] = [
  // { item: 'archive', title: 'ARCHIVE_TITLE', icon: <ArchiveIcon /> },
  // {
  //   item: 'settings',
  //   title: 'SETTINGS_TITLE',
  //   icon: <SettingsSelect />,
  // },
  { item: 'language', title: 'LANGUAGE', icon: <GlobalOutlined /> },
  // { item: 'profile', title: 'PROFILE_TITLE', icon: <SettingOutlined width={20} height={20} /> },
];

export const USER_SIDE_ITEMS: UserSideItem[] = [
  { item: 'chats', element: <Chats /> },
  { item: 'archive', element: <Chats archived /> },
  { item: 'contacts', element: <Contacts /> }, // view-all users only (see above)
  { item: 'instance', element: <InstanceSettings /> },
  { item: 'profile', element: <Profile /> },
  { item: 'language', element: <Language /> },
  { item: 'logout', element: <Logout /> },
  // { item: 'statuses', element: <Statuses /> }, // blocked in the fork (see above)
];
