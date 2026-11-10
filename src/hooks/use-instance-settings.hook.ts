import { useEffect } from 'react';

import { useAppSelector } from './redux.hook';
import { useIsMaxInstance } from './use-is-max-instance';
import { useGetWaSettingsQuery, useGetAccountSettingsQuery } from 'services/green-api/endpoints';
import { selectInstance, selectTypeInstance, selectWaSettings } from 'store/slices/instances.slice';
import { GetWaSettingsResponseInterface } from 'types';

interface UseInstanceSettingsOptions {
  pollingInterval?: number;
}

interface UseInstanceSettingsResult {
  settings: GetWaSettingsResponseInterface | undefined;
  isLoading: boolean;
  error: unknown;
  isMax: boolean;
}

export const useInstanceSettings = ({
  pollingInterval,
}: UseInstanceSettingsOptions = {}): UseInstanceSettingsResult => {
  const isMax = useIsMaxInstance();
  const selectedInstance = useAppSelector(selectInstance);
  const typeInstance = useAppSelector(selectTypeInstance);
  const manualWaSettings = useAppSelector(selectWaSettings);

  // No apiTokenInstance in the client: every call goes through the middleware with
  // the Salesforce session, so "credentials present" means a session id.
  const isAccountSettingsInstance = isMax || typeInstance === 'telegram';
  const skipWa =
    !selectedInstance?.idInstance || !selectedInstance?.sessionId || isAccountSettingsInstance;
  const skipAccount =
    !selectedInstance?.idInstance || !selectedInstance?.sessionId || !isAccountSettingsInstance;

  const {
    data: waSettings,
    isLoading: isWaLoading,
    error: waError,
    refetch: refetchWa,
  } = useGetWaSettingsQuery({ ...selectedInstance }, { skip: skipWa, pollingInterval });

  const {
    data: accountSettings,
    isLoading: isAccountLoading,
    error: accountError,
    refetch: refetchAccount,
  } = useGetAccountSettingsQuery({ ...selectedInstance }, { skip: skipAccount, pollingInterval });

  // Use manual waSettings from Redux as fallback when RTK Query data is not available
  const rtkSettings = isAccountSettingsInstance ? accountSettings : waSettings;
  const settings = rtkSettings ?? manualWaSettings ?? undefined;
  const isLoading = isAccountSettingsInstance ? isAccountLoading : isWaLoading;
  const error = isAccountSettingsInstance ? accountError : waError;
  const refetch = isAccountSettingsInstance ? refetchAccount : refetchWa;

  useEffect(() => {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = error.status;
      if (status === 429) {
        const timeout = setTimeout(() => {
          refetch();
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [error, refetch]);

  return { settings, isLoading, error, isMax };
};
