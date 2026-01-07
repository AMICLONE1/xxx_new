import { useEffect, useState, useCallback } from 'react';
import { useKYCStore } from '@/store';
import { useAuthStore } from '@/store';
import { KYCStatus } from '@/types';

export const useKYCStatus = (pollInterval: number = 30000) => {
  const { overallStatus, fetchKYCDocuments, syncFromBackend } = useKYCStore();
  const { user } = useAuthStore();
  const [isPolling, setIsPolling] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await syncFromBackend(user.id);
    } catch (error) {
      console.error('Failed to check KYC status:', error);
    }
  }, [user?.id, syncFromBackend]);

  useEffect(() => {
    // Only poll if status is pending and we have a user
    if (overallStatus === 'pending' && !isPolling && user?.id) {
      setIsPolling(true);
      checkStatus();

      const interval = setInterval(() => {
        checkStatus();
      }, pollInterval);

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    }
  }, [overallStatus, pollInterval, user?.id, isPolling, checkStatus]);

  return {
    status: overallStatus,
    isPolling,
    refreshStatus: checkStatus,
  };
};

