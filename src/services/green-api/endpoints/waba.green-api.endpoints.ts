import { MIDDLEWARE_URL } from 'configs';
import { journalsGreenApiEndpoints } from 'services/green-api/endpoints/journals.green-api.endpoints';
import { greenAPI } from 'services/green-api/green-api.service';
import type { RootState } from 'store';
import { chatActions, selectLastMessagesByChatId } from 'store/slices/chat.slice';
import {
  GetChatHistoryParametersInterface,
  GetTemplateByIdParametersInterface,
  GetTemplatesResponseInterface,
  InstanceInterface,
  SendingResponseInterface,
  SendTemplateParameters,
  WabaTemplateResponseInterface,
} from 'types';
import { generateTempMessageId } from 'utils';

export const wabaGreenApiEndpoints = greenAPI.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<GetTemplatesResponseInterface, InstanceInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/getTemplates`,
        params: { instanceUrl, sessionId, orgId },
      }),
      providesTags: (result, __, argument) =>
        result
          ? [
              { type: 'wabaTemplates', id: argument.idInstance },
              { type: 'wabaTemplates', id: 'templates' },
            ]
          : [{ type: 'wabaTemplates', id: 'templates' }],
    }),
    getTemplateById: builder.query<
      WabaTemplateResponseInterface,
      GetTemplateByIdParametersInterface
    >({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      query: ({ idInstance, instanceUrl, sessionId, orgId, rtkSessionId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/getTemplateById`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      providesTags: (result, _, arguments_) => {
        if (result) return [{ type: 'wabaTemplates', id: arguments_.templateId }];
        return [{ type: 'waSettings', id: 'WabaTemplate' }];
      },
    }),
    sendTemplate: builder.mutation<SendingResponseInterface, SendTemplateParameters>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/sendTemplate`,
        params: { instanceUrl, sessionId, orgId },
        method: 'POST',
        body,
      }),
      onQueryStarted: async (
        { idInstance, chatId, templateId, params },
        { dispatch, getState, queryFulfilled }
      ) => {
        const state = getState() as RootState;
        const previousLastMessage = selectLastMessagesByChatId(state)[chatId] ?? null;
        const tempIdMessage = generateTempMessageId();

        const chatHistoryEntries = journalsGreenApiEndpoints.util
          .selectInvalidatedBy(state, ['chatHistory'])
          .filter(
            (entry) =>
              entry.endpointName === 'getChatHistory' &&
              (entry.originalArgs as GetChatHistoryParametersInterface).chatId === chatId &&
              (entry.originalArgs as GetChatHistoryParametersInterface).idInstance === idInstance
          );

        const optimisticMessage = {
          type: 'outgoing' as const,
          typeMessage: 'templateMessage' as const,
          timestamp: Math.floor(Date.now() / 1000),
          senderName: '',
          senderContactName: '',
          idMessage: tempIdMessage,
          chatId,
          templateMessage: {
            templateId,
            params,
          },
          statusMessage: 'pending' as const,
        };

        const patches = chatHistoryEntries.map(({ originalArgs }) =>
          dispatch(
            journalsGreenApiEndpoints.util.updateQueryData(
              'getChatHistory',
              originalArgs as GetChatHistoryParametersInterface,
              (draft) => {
                draft.push({ ...optimisticMessage });

                return draft;
              }
            )
          )
        );

        dispatch(chatActions.setLastMessageByChatId({ chatId, message: optimisticMessage }));

        try {
          const { data } = await queryFulfilled;

          chatHistoryEntries.forEach(({ originalArgs }) =>
            dispatch(
              journalsGreenApiEndpoints.util.updateQueryData(
                'getChatHistory',
                originalArgs as GetChatHistoryParametersInterface,
                (draft) => {
                  const pendingMessage = draft.find((msg) => msg.idMessage === tempIdMessage);

                  if (!pendingMessage) return;

                  pendingMessage.idMessage = data.idMessage;
                  pendingMessage.statusMessage = 'sent';
                }
              )
            )
          );

          dispatch(
            chatActions.setLastMessageByChatId({
              chatId,
              message: { ...optimisticMessage, idMessage: data.idMessage, statusMessage: 'sent' },
            })
          );
        } catch {
          patches.forEach((patch) => patch.undo());
          dispatch(chatActions.setLastMessageByChatId({ chatId, message: previousLastMessage }));
        }
      },
    }),
  }),
});
