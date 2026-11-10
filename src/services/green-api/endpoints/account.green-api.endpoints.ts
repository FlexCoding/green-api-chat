import { MIDDLEWARE_URL } from 'configs';
import { greenAPI } from 'services/green-api/green-api.service';
import { instancesActions } from 'store/slices/instances.slice';
import {
  CheckWhatsappParametersInterface,
  GetQRResponseInterface,
  GetSettingsResponseInterface,
  GetStateInstanceResponseInterface,
  GetWaSettingsResponseInterface,
  InstanceInterface,
  LogoutResponseInterface,
  QRResponseInterface,
  SendMaxAuthCodeParametersInterface,
  StartAuthorizationResponseInterface,
} from 'types';
import { normalizeAvatarSrc } from 'utils/image.utils';

const transformWaSettingsResponse = (response: GetWaSettingsResponseInterface) => {
  const normalizedBase64Avatar = normalizeAvatarSrc(response.base64Avatar);
  const normalizedAvatar = normalizeAvatarSrc(response.avatar);

  return {
    ...response,
    avatar: normalizedBase64Avatar || normalizedAvatar,
  };
};

export const accountGreenApiEndpoints = greenAPI.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<GetSettingsResponseInterface, InstanceInterface>({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/getSettings`,
        params: { instanceUrl, sessionId, orgId },
      }),
      keepUnusedDataFor: 1000,
    }),
    getWaSettings: builder.query<
      GetWaSettingsResponseInterface,
      InstanceInterface & { rtkWaSettingsSessionKey?: number }
    >({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/getWaSettings`,
        params: { instanceUrl, sessionId, orgId },
      }),
      transformResponse: transformWaSettingsResponse,
      keepUnusedDataFor: 1000,
      providesTags: (result, _, arguments_) => {
        if (result) return [{ type: 'waSettings', id: arguments_.idInstance }, 'lastMessages'];
        return [{ type: 'waSettings', id: 'waAccountSettings' }, 'lastMessages'];
      },
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(instancesActions.setWaSettings(data));
        } catch {
          // ignore errors
        }
      },
    }),
    getAccountSettings: builder.query<
      GetWaSettingsResponseInterface,
      InstanceInterface & { rtkWaSettingsSessionKey?: number }
    >({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/getAccountSettings`,
        params: { instanceUrl, sessionId, orgId },
      }),
      transformResponse: transformWaSettingsResponse,
      keepUnusedDataFor: 1000,
      providesTags: (result, _, arguments_) => {
        if (result) return [{ type: 'waSettings', id: arguments_.idInstance }, 'lastMessages'];
        return [{ type: 'waSettings', id: 'waAccountSettings' }, 'lastMessages'];
      },
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(instancesActions.setWaSettings(data));
        } catch {
          // ignore errors
        }
      },
    }),
    getStateInstance: builder.query<GetStateInstanceResponseInterface, InstanceInterface>({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/getStateInstance`,
        params: { instanceUrl, sessionId, orgId },
      }),
    }),
    getAuthorizationCode: builder.mutation<
      GetQRResponseInterface,
      CheckWhatsappParametersInterface
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/getAuthorizationCode`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
    }),
    logout: builder.mutation<LogoutResponseInterface, InstanceInterface>({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/logout`,
        params: { instanceUrl, sessionId, orgId },
      }),
      invalidatesTags: (_, __, arguments_) => {
        return [{ type: 'waSettings', id: arguments_.idInstance }];
      },
    }),
    startAuthorization: builder.mutation<
      StartAuthorizationResponseInterface,
      CheckWhatsappParametersInterface
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/startAuthorization`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
    }),
    sendAuthorizationCode: builder.mutation<
      StartAuthorizationResponseInterface,
      SendMaxAuthCodeParametersInterface
    >({
      query: ({ idInstance, instanceUrl, sessionId, orgId, ...body }) => ({
        url: `${MIDDLEWARE_URL}/sendAuthorizationCode`,
        method: 'POST',
        params: { instanceUrl, sessionId, orgId },
        body,
      }),
      invalidatesTags: (_, __, arguments_) => {
        return [{ type: 'waSettings', id: arguments_.idInstance }];
      },
    }),
    qr: builder.mutation<QRResponseInterface, InstanceInterface>({
      query: ({ instanceUrl, sessionId, orgId }) => ({
        url: `${MIDDLEWARE_URL}/qr`,
        params: { instanceUrl, sessionId, orgId },
      }),
    }),
  }),
});
