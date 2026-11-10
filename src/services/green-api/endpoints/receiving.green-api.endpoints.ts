import { MIDDLEWARE_URL } from 'configs';
import { greenAPI } from 'services/green-api/green-api.service';
import {
  InstanceInterface,
  ReceiveNotificationResponseInterface,
  DeleteNotificationParameters,
  ResultResponseInterface,
  DownloadFileResponseInterface,
  GetChatInformationParameters,
} from 'types';

export const receivingGreenApiEndpoints = greenAPI.injectEndpoints({
  endpoints: (builder) => ({
    receiveNotification: builder.query<ReceiveNotificationResponseInterface, InstanceInterface>({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/receiveNotification`,
        params: { instanceUrl, sessionId, orgId },
      }),
    }),
    deleteNotification: builder.mutation<ResultResponseInterface, DeleteNotificationParameters>({
      query: ({ receiptId, instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/deleteNotification/${receiptId}`,
        method: 'DELETE',
        params: { instanceUrl, sessionId, orgId },
      }),
    }),
    downloadFile: builder.mutation<DownloadFileResponseInterface, GetChatInformationParameters>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/downloadFile`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
    }),
  }),
});
