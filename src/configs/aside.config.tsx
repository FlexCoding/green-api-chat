import { GlobalOutlined, SettingOutlined } from '@ant-design/icons';

import ChatIcon from 'assets/icons/chat.svg?react';
import InstanceIcon from 'assets/icons/instance-icon.svg?react';
import Chats from 'components/full-chat/user-side/chats/chats.component';
import { InstanceSettings } from 'components/full-chat/user-side/settings/instance.component';
import { Language } from 'components/full-chat/user-side/settings/language.componet';
import { Logout } from 'components/full-chat/user-side/settings/logout.component';
import { Profile } from 'components/full-chat/user-side/settings/profile.component';
import { SettingsSelect } from 'components/UI/select/select-settigs.component';
import { AsideItem, ChatType, TypeInstance, UserSideItem } from 'types';

export const asideTopIconItems: (
  type: ChatType,
  typeInstance: TypeInstance
) => (AsideItem | null)[] = (
  type,
  // kept for upstream compatibility (used by the blocked Statuses/Contacts items)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  typeInstance
) => [
  type !== 'partner-iframe' && type !== 'one-chat-only'
    ? { item: 'instance', title: 'INSTANCE', icon: <InstanceIcon /> }
    : null,
  { item: 'chats', title: 'CHATS_TITLE', icon: <ChatIcon /> },
  // Fork: Statuses and Contacts tabs are blocked. Statuses = "update status" (blocked
  // since 31faf0e) plus every contact's status feed; Contacts = the instance's whole
  // address book. Both would bypass the middleware's per-user opportunity filter.
  // To re-enable: restore the two upstream items below.
  // typeInstance === 'whatsapp'
  //   ? { item: 'statuses', title: 'STATUSES', icon: <StatusIcon />, waOnly: true }
  //   : null,
  // type !== 'one-chat-only' && (typeInstance === 'whatsapp' || typeInstance === 'v3')
  //   ? { item: 'contacts', title: 'CONTACTS', icon: <ContactIcon /> }
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
  // { item: 'contacts', element: <Contacts /> }, // blocked in the fork (see above)
  { item: 'instance', element: <InstanceSettings /> },
  { item: 'profile', element: <Profile /> },
  { item: 'language', element: <Language /> },
  { item: 'logout', element: <Logout /> },
  // { item: 'statuses', element: <Statuses /> }, // blocked in the fork (see above)
];
