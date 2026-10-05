import { MIDDLEWARE_URL } from 'configs';

import { greenAPI } from 'services/green-api/green-api.service';
import {
  GetChatHistoryParametersInterface,
  GetChatHistoryResponse,
  LastMessagesParametersInterface,
} from 'types';

export const journalsGreenApiEndpoints = greenAPI.injectEndpoints({
  endpoints: (builder) => ({
    getChatHistory: builder.query<GetChatHistoryResponse, GetChatHistoryParametersInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/getChatHistory`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      // Raw items, oldest first. Service items (reactions / delete / edit markers)
      // are filtered in the chat view, so the cached length stays the raw length:
      // a response shorter than the requested count = start of history (the
      // middleware merges Green's window with the archive beyond it).
      transformResponse: (res: GetChatHistoryResponse) =>
        Array.isArray(res) ? [...res].reverse() : [],
      providesTags: ['chatHistory'],
    }),
    lastIncomingMessages: builder.query<GetChatHistoryResponse, LastMessagesParametersInterface>({
      query: ({ minutes }) => ({
        url: `${MIDDLEWARE_URL}/lastIncomingMessages`,
        method: 'GET',
        params: {
          minutes,
        },
      }),
    }),
    lastOutgoingMessages: builder.query<GetChatHistoryResponse, LastMessagesParametersInterface>({
      query: ({ minutes }) => ({
        url: `${MIDDLEWARE_URL}/lastOutgoingMessages`,
        method: 'GET',
        params: {
          minutes,
        },
      }),
    }),
    lastMessages: builder.query<GetChatHistoryResponse, LastMessagesParametersInterface>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['lastMessages'],
    }),
  }),
});
