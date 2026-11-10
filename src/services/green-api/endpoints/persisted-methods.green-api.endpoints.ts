import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { MIDDLEWARE_URL } from 'configs';
import { withGroupKey } from 'services/green-api/green-api.service';
import {
  GetAvatarResponseInterface,
  GetGroupDataResponseInterface,
  GroupBaseParametersInterface,
  RequestWithChatIdParameters,
} from 'types';
import { isHydrateAction } from 'utils/hydrate';
import { normalizeAvatarSrc } from 'utils/image.utils';

const rawPersistedBaseQuery = fetchBaseQuery({ baseUrl: '/' });

// Separate API from greenAPI, so it needs the groupKey injection too (multi-number orgs
// otherwise get 403 NO_GROUP on getAvatar/getGroupData).
const persistedBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (
  args,
  api,
  extraOptions
) => rawPersistedBaseQuery(withGroupKey(args), api, extraOptions);

export const persistedMethods = createApi({
  reducerPath: 'groupPersistentAPI',
  baseQuery: persistedBaseQuery,

  extractRehydrationInfo(action, { reducerPath }): any {
    if (isHydrateAction(action)) {
      if (action.key === reducerPath) {
        return action.payload;
      }

      return action.payload?.[persistedMethods.reducerPath] ?? undefined;
    }
  },
  tagTypes: ['groupData', 'avatar'],

  endpoints: (builder) => ({
    getGroupData: builder.query<GetGroupDataResponseInterface, GroupBaseParametersInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/getGroupData`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      providesTags: (result, error, { groupId, chatId }) => [
        { type: 'groupData', id: chatId ?? groupId },
      ],
    }),
    getAvatar: builder.query<GetAvatarResponseInterface, RequestWithChatIdParameters>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/getAvatar`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      transformResponse: (response: GetAvatarResponseInterface) => ({
        ...response,
        urlAvatar:
          normalizeAvatarSrc(response.base64Avatar) || normalizeAvatarSrc(response.urlAvatar),
      }),
      providesTags: (result, error, { chatId }) => [{ type: 'avatar', id: chatId }],
    }),
  }),
});
