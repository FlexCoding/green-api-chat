import { MIDDLEWARE_URL } from 'configs';
import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { RootState } from 'store';
import { InstanceInterface, MessageInterface } from 'types';
import { getIsMiniVersion, getLastChats, updateLastChats, getAllChats } from 'utils';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '',
  timeout: 70000,
});

// The WhatsApp group this session belongs to (from the embedding URL). The
// middleware routes each group to its own WhatsApp number, so the key must ride
// on EVERY middleware request — injected here centrally instead of in each of
// the dozens of endpoint definitions.
let middlewareGroupKey: string | null = null;

export const setMiddlewareGroupKey = (groupKey: string | null) => {
  middlewareGroupKey = groupKey;
};

const withGroupKey = (args: string | FetchArgs): string | FetchArgs => {
  if (typeof args === 'string' || !middlewareGroupKey) return args;
  if (!args.url || !args.url.startsWith(MIDDLEWARE_URL)) return args;
  return { ...args, params: { ...(args.params ?? {}), groupKey: middlewareGroupKey } };
};

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (
  args,
  api,
  extraOptions
) => rawBaseQuery(withGroupKey(args), api, extraOptions);

let attemptIdToGetChats = 1;

const customQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  if (api.endpoint !== 'lastMessages') {
    return baseQuery(args, api, extraOptions);
  }

  const state = api.getState() as RootState;
  const type = state.chatReducer.type;
  const {  allMessages, minutesToRefetch ,  instanceUrl, sessionId, orgId, ownerId, } = (
    args as FetchArgs
  ).params as InstanceInterface & { allMessages?: boolean; minutesToRefetch?: number; };

  const cacheKey = `lastMessages(${JSON.stringify({ allMessages })})`;
  const currentChats: MessageInterface[] | undefined = state.greenAPI.queries[cacheKey]?.data as
    | MessageInterface[]
    | undefined;

  let minutes = minutesToRefetch ?? 3;

  if (!currentChats?.length) {
    minutes = getIsMiniVersion(type) ? 1440 : 2880;

    if (type === 'partner-iframe') {
      minutes = 2880;
    }

    // Caller can request a larger history window (progressive load-more on scroll).
    if (minutesToRefetch !== undefined && minutesToRefetch > minutes) {
      minutes = minutesToRefetch;
    }
  }

  if (!currentChats && getIsMiniVersion(type) && attemptIdToGetChats < 6) {
    minutes = 1440;
    attemptIdToGetChats++;
  }

  const [lastIncomingMessages, lastOutgoingMessages] = await Promise.all([
    baseQuery(
      {
        // url: `/lastIncomingMessages/${apiTokenInstance}`,
        url: `${MIDDLEWARE_URL}/lastIncomingMessages`,
        params: { minutes, orgId, instanceUrl, sessionId, ownerId },
      },
      { ...api, endpoint: 'lastIncomingMessages' },
      extraOptions
    ),
    baseQuery(
      {
        url: `${MIDDLEWARE_URL}/lastOutgoingMessages`,
        params: { minutes, orgId, instanceUrl, sessionId, ownerId },
      },
      { ...api, endpoint: 'lastOutgoingMessages' },
      extraOptions
    ),
  ]);

  if (lastIncomingMessages.data && lastOutgoingMessages.data) {
    if (allMessages) {
      !currentChats
        ? (lastIncomingMessages.data = getAllChats(
            lastIncomingMessages.data as MessageInterface[],
            lastOutgoingMessages.data as MessageInterface[]
          ))
        : (lastIncomingMessages.data = updateLastChats(
            currentChats as MessageInterface[],
            lastIncomingMessages.data as MessageInterface[],
            lastOutgoingMessages.data as MessageInterface[],
            getIsMiniVersion(type) ? 5 : undefined
          ));
    } else {
      lastIncomingMessages.data = !currentChats
        ? getLastChats(
            lastIncomingMessages.data as MessageInterface[],
            lastOutgoingMessages.data as MessageInterface[],
            getIsMiniVersion(type) ? 5 : undefined
          )
        : updateLastChats(
            currentChats as MessageInterface[],
            lastIncomingMessages.data as MessageInterface[],
            lastOutgoingMessages.data as MessageInterface[],
            getIsMiniVersion(type) ? 5 : undefined
          );
    }
  }

  if (lastIncomingMessages.error || lastOutgoingMessages.error) {
    lastIncomingMessages.error = lastIncomingMessages.error || lastOutgoingMessages.error;
  }

  return lastIncomingMessages;
};

export const greenAPI = createApi({
  reducerPath: 'greenAPI',
  baseQuery: customQuery,
  endpoints: () => ({}),
  tagTypes: [
    'lastMessages',
    'wabaTemplates',
    'waSettings',
    'groupData',
    'chatHistory',
    'avatar',
    'statuses',
  ],
});
