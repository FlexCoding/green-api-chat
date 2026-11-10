import { MIDDLEWARE_URL } from 'configs';
import { persistor } from 'main';
import { greenAPI } from 'services/green-api/green-api.service';
import {
  AddGroupParticipantResponseInterface,
  GroupBaseParametersInterface,
  UpdateGroupNameInterface,
  UpdateGroupNameResponseInterface,
  GroupParticipantApiInterface,
  RemoveGroupParticipantResponseInterface,
  SetGroupAdminInterface,
  SetGroupAdminResponseInterface,
  RemoveGroupAdminResponseInterface,
  SetGroupPictureResponseInterface,
  LeaveGroupResponseInterface,
} from 'types';

const clearPersistRootOnSuccess = async (
  _arg: unknown,
  { queryFulfilled }: { queryFulfilled: Promise<unknown> }
) => {
  try {
    await queryFulfilled;
    console.log('Clearing persist:root due to group data change');
    localStorage.removeItem('persist:root');
  } catch {}
};

export const groupGreenApiEndpoints = greenAPI.injectEndpoints({
  endpoints: (builder) => ({
    updateGroupName: builder.mutation<UpdateGroupNameResponseInterface, UpdateGroupNameInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/updateGroupName`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId, chatId }) => [
        { type: 'groupData', id: chatId ?? groupId },
        { type: 'chatHistory' },
      ],
    }),

    addGroupParticipant: builder.mutation<
      AddGroupParticipantResponseInterface,
      GroupParticipantApiInterface
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/addGroupParticipant`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId }) => [{ type: 'groupData', id: groupId }],
    }),

    removeParticipant: builder.mutation<
      RemoveGroupParticipantResponseInterface,
      GroupParticipantApiInterface
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/removeGroupParticipant`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId }) => [{ type: 'groupData', id: groupId }],
    }),

    setGroupAdmin: builder.mutation<SetGroupAdminResponseInterface, SetGroupAdminInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/setGroupAdmin`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId, chatId }) => [
        { type: 'groupData', id: chatId ?? groupId },
      ],
    }),

    removeAdmin: builder.mutation<RemoveGroupAdminResponseInterface, SetGroupAdminInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/removeAdmin`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId, chatId }) => [
        { type: 'groupData', id: chatId ?? groupId },
      ],
    }),

    setGroupPicture: builder.mutation<
      SetGroupPictureResponseInterface,
      {
        idInstance: string;
        instanceUrl: string;
        sessionId: string;
        orgId: string;
        // apiTokenInstance: string;
        // apiUrl: string;
        body: FormData;
      }
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/setGroupPicture`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { body }) => {
        const groupId = body.get('groupId');
        const chatId = body.get('chatId');

        return [
          {
            type: 'avatar',
            id:
              typeof chatId === 'string'
                ? chatId
                : typeof groupId === 'string'
                  ? groupId
                  : undefined,
          },
          { type: 'groupData' },
        ];
      },
    }),

    leaveGroup: builder.mutation<LeaveGroupResponseInterface, GroupBaseParametersInterface>({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/leaveGroup`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      onQueryStarted: clearPersistRootOnSuccess,
      invalidatesTags: (result, error, { groupId, chatId }) => [
        { type: 'groupData', id: chatId ?? groupId },
      ],
    }),
  }),
});
