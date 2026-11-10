import { useEffect, useRef, useState } from 'react';

import { useAppDispatch } from './redux.hook';
import { MIDDLEWARE_URL } from 'configs';
import { qrInstructionSlice } from 'store/slices/qr-instruction.slice';
import { QrWebsocketResponseInterface } from 'types';

export const useQrWebsocket = (
  orgId: string,
  instanceUrl: string,
  sessionId: string,
  onClose: () => void
) => {
  const dispatch = useAppDispatch();
  const showQrInstruction = qrInstructionSlice.actions.showQrInstruction;

  const [qrData, setQrData] = useState('');
  const [qrText, setQrText] = useState('FIRST_GET_QR_DATA');

  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isQrError, setIsQrError] = useState(false);

  const socket = useRef<WebSocket>();

  useEffect(() => {
    if (!socket.current) return;

    return () => {
      socket.current?.close();
    };
  }, [socket.current]);

  function openQrWebsocket(
    {
      // idInstance,
      // apiTokenInstance,
    }: {
      // idInstance: string;
      // apiTokenInstance: string;
    }
  ) {
    if (!socket.current) {
      const wsUrl = MIDDLEWARE_URL.replace(/^http?/, 'ws');
      // const wsUrl = MIDDLEWARE_URL.replace(/^https?/, 'wss');
      socket.current = new WebSocket(
        `${wsUrl}/scanqrcode?orgId=${orgId}&instanceUrl=${instanceUrl}&sessionId=${sessionId}`
      );

      if (isQrError) setIsQrError(false);
      setIsQrLoading(true);

      socket.current.addEventListener('message', (response: MessageEvent<string>) => {
        try {
          const data: QrWebsocketResponseInterface = JSON.parse(response.data);

          setQrData(data.type === 'alreadyLogged' ? '' : data.message);
          setIsQrLoading(false);

          if (data.type !== 'qrCode') {
            socket.current?.close();
            socket.current = undefined;
          }

          if (data.type === 'alreadyLogged') {
            setTimeout(() => {
              onClose();
            }, 1000);
            setQrData('');
            return;
          }

          if (data.type === 'timeout') {
            setQrData('');
            setQrText('FIRST_GET_QR_DATA');
            return;
          }

          if (data.type === 'error') {
            if (data.message.includes('Multi-device beta not joined')) {
              setQrText('BETA_NOT_JOINED');
              return;
            }

            setQrText('FAILED_GET_QR_DATA');
            setIsQrError(true);
            setQrData('');

            if (data.message === 'Instance has auth. You need to make log out') {
              dispatch(showQrInstruction());
              return;
            }
          }
        } catch (error: SyntaxError | unknown) {
          if (error instanceof SyntaxError) {
            console.error(`websocket JSON parse failed: ${response.data}`);
            setQrText('FAILED_GET_QR_DATA');
          } else {
            console.error(`websocket unknown failed: ${error}`);
          }
        }
      });
    }
  }

  return { openQrWebsocket, isQrLoading, isQrError, qrData, qrText };
};
