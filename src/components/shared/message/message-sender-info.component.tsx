import { FC } from 'react';

import { Space } from 'antd';

import { MessageProps } from './message.component';

type MessageSenderInfoProps = Pick<MessageProps['messageDataForRender'], 'phone' | 'senderName'> & {
  style?: React.CSSProperties;
};

const digitsOf = (value?: string) => (value || '').replace(/\D/g, '');

const MessageSenderInfo: FC<MessageSenderInfoProps> = ({ senderName, phone, style }) => {
  // WhatsApp falls back to the raw number as the sender name when the contact
  // has no pushname — showing name AND phone then renders the same number
  // twice and overflows the narrow utility-bar panel. Collapse to one.
  const nameIsSameNumber = Boolean(phone) && digitsOf(senderName) === digitsOf(phone);
  const displayName = nameIsSameNumber ? undefined : senderName;

  return (
    <Space>
      {displayName && (
        <h4
          className="text-overflow message-signerData"
          style={{ maxWidth: 205, ...style }}
          title={displayName}
        >
          {displayName}
        </h4>
      )}
      {phone && (
        <div
          className="text-overflow message-signerData"
          dir="ltr"
          style={{ marginLeft: displayName ? 5 : undefined, maxWidth: 180 }}
        >
          {phone}
        </div>
      )}
    </Space>
  );
};

export default MessageSenderInfo;
