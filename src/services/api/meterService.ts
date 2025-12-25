import { apiClient } from './client';
import { Meter, EnergyData, ApiResponse } from '@/types';
import { MeterSimulator } from '@/services/mock/meterSimulator';
import { getMeterConfig } from '@/utils/meterConfig';
import Constants from 'expo-constants';

// Check if mock mode is enabled (default: true in development)
const USE_MOCK_METER = 
  Constants.expoConfig?.extra?.useMockMeter !== false || 
  __DEV__;

export interface RegisterMeterRequest {
  discomName: string;
  consumerNumber: string;
  meterSerialId: string;
  billImageUri: string;
}

export interface MeterVerificationResponse {
  meter: Meter;
  verified: boolean;
}

class MeterService {
  private simulator: MeterSimulator | null = null;

  async registerMeter(data: RegisterMeterRequest): Promise<ApiResponse<Meter>> {
    if (USE_MOCK_METER) {
      // Mock implementation - return success immediately
      const mockMeter: Meter = {
        id: `meter_${Date.now()}`,
        userId: 'current_user_id', // Will be replaced with actual user ID
        discomName: data.discomName,
        consumerNumber: data.consumerNumber,
        meterSerialId: data.meterSerialId,
        verificationStatus: 'verified', // Auto-verify in mock mode
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        data: mockMeter,
      };
    }

    // Real API call
    return apiClient.post('/meters/register', data);
  }

  async verifyMeter(meterId: string): Promise<ApiResponse<MeterVerificationResponse>> {
    if (USE_MOCK_METER) {
      // Auto-verify in mock mode
      return {
        success: true,
        data: {
          meter: {
            id: meterId,
            userId: 'current_user_id',
            discomName: 'MSEDCL',
            consumerNumber: '123456789',
            meterSerialId: 'METER123',
            verificationStatus: 'verified',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          verified: true,
        },
      };
    }

    return apiClient.post(`/meters/${meterId}/verify`, {});
  }

  async getMeterData(
    meterId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<EnergyData[]>> {
    if (USE_MOCK_METER) {
      // Generate fake data
      if (!this.simulator) {
        this.simulator = new MeterSimulator(getMeterConfig());
      }

      const data = this.simulator.generateEnergyData(meterId, startDate, endDate);
      return {
        success: true,
        data,
      };
    }

    // Real API call
    return apiClient.get(
      `/meters/${meterId}/data?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
  }

  async getLatestMeterData(meterId: string): Promise<ApiResponse<EnergyData>> {
    if (USE_MOCK_METER) {
      // Generate fake real-time data
      if (!this.simulator) {
        this.simulator = new MeterSimulator(getMeterConfig());
      }

      const data = this.simulator.generateRealTimeData(meterId);
      return {
        success: true,
        data,
      };
    }

    // Real API call
    return apiClient.get(`/meters/${meterId}/data/latest`);
  }

  async requestHardwareInstallation(data: {
    address: string;
    loadCapacity: number;
  }): Promise<ApiResponse<{ requestId: string }>> {
    if (USE_MOCK_METER) {
      // Mock implementation
      return {
        success: true,
        data: {
          requestId: `req_${Date.now()}`,
        },
      };
    }

    return apiClient.post('/meters/request-installation', data);
  }
}

export const meterService = new MeterService();

