import { FC, useState } from 'react';

import { SmileOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import clsx from 'clsx';

import { useAppSelector } from 'hooks';
import { useSendReactionMutation } from 'services/green-api/endpoints';
import { selectActiveChat } from 'store/slices/chat.slice';
import { selectInstance } from 'store/slices/instances.slice';
import { ActiveChat, TypeConnectionMessage } from 'types';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  idMessage: string;
  type: TypeConnectionMessage;
  myReaction?: string;
}

// Hover smiley beside a message (WhatsApp Web style) -> 6 quick reactions.
// Clicking the emoji that is already mine removes it (Green: empty reaction).
const ReactionPicker: FC<ReactionPickerProps> = ({ idMessage, type, myReaction }) => {
  const instanceCredentials = useAppSelector(selectInstance);
  const activeChat = useAppSelector(selectActiveChat) as ActiveChat;
  const [sendReaction] = useSendReactionMutation();
  const [open, setOpen] = useState(false);

  const onPick = (emoji: string) => {
    setOpen(false);
    sendReaction({
      ...instanceCredentials,
      chatId: activeChat.chatId,
      idMessage,
      reaction: emoji === myReaction ? '' : emoji,
    });
  };

  return (
    <span className={clsx('message-reaction-trigger', `message-reaction-trigger--${type}`, open && 'open')}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="top"
        arrow={false}
        rootClassName="message-reaction-popover"
        content={
          <div className="message-reaction-picker">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={clsx(
                  'message-reaction-picker__item',
                  emoji === myReaction && 'selected'
                )}
                onClick={() => onPick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        }
      >
        <button type="button" className="message-reaction-trigger__button" aria-label="reaction">
          <SmileOutlined />
        </button>
      </Popover>
    </span>
  );
};

export default ReactionPicker;
