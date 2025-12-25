import { useEffect, useState } from 'react';
import { useKYCStore } from '@/store';
import { kycService } from '@/services/api/kycService';
import { KYCStatus } from '@/types';

export const useKYCStatus = (pollInterval: number = 30000) => {
  const { status, setStatus, setKYCData } = useKYCStore();
  const [isPolling, setIsPolling] = useState(false);

  const checkStatus = async () => {
    try {
      const response = await kycService.getKYCStatus();
      if (response.success && response.data) {
        setKYCData(response.data);
        setStatus(response.data.status);
      }
    } catch (error) {
      console.error('Failed to check KYC status:', error);
    }
  };

  useEffect(() => {
    // Only poll if status is pending
    if (status === 'pending' && !isPolling) {
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
  }, [status, pollInterval]);

  return {
    status,
    isPolling,
    refreshStatus: checkStatus,
  };
};

