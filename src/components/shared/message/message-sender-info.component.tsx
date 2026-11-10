import { FC } from 'react';

import { Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { MessageProps } from './message.component';

type MessageSenderInfoProps = Pick<
  MessageProps['messageDataForRender'],
  'phone' | 'senderName' | 'senderType'
> & {
  style?: React.CSSProperties;
};

const digitsOf = (value?: string) => (value || '').replace(/\D/g, '');

const MessageSenderInfo: FC<MessageSenderInfoProps> = ({
  senderName,
  senderType,
  phone,
  style,
}) => {
  const { t } = useTranslation();

  // WhatsApp falls back to the raw number as the sender name when the contact
  // has no pushname — showing name AND phone then renders the same number
  // twice and overflows the narrow utility-bar panel. Collapse to one.
  const nameIsSameNumber = Boolean(phone) && digitsOf(senderName) === digitsOf(phone);
  const displayName = nameIsSameNumber ? undefined : senderName;

  return (
    <Space align="center" size={10} className="message-sender-row">
      <div className="message-sender-row__main">
        {displayName && (
          <h4
            className="text-overflow message-signerData"
            style={{ maxWidth: 205, marginBottom: 0, lineHeight: 1, ...style }}
            title={displayName}
          >
            {displayName}
          </h4>
        )}
        {senderType === 'bot' && <span className="message-sender-row__type">{t('BOT_LABEL')}</span>}
      </div>
      {phone && (
        <div
          className="text-overflow message-signerData message-sender-row__phone"
          dir="ltr"
          style={{ maxWidth: 180 }}
        >
          {phone}
        </div>
      )}
    </Space>
  );
};

export default MessageSenderInfo;
