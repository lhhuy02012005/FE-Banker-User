import { SERVICE_PREFIX } from '@/app/constants/config';
import axiosClient from '@/app/lib/axios';

export interface CampaignResponse {
  id: string;
  name: string;
  description?: string;
  actionType: 'CASH_BACK' | 'GIFT_NOTIFICATION';
  actionValue: string;
  startTime: string;
  endTime: string;
  totalQuantity: number;
  remainingQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UPCOMING';
}

export interface CampaignHistoryDetailResponse {
  historyId: string;
  campaignId: string;
  userId: string;
  deviceId?: string;
  joinedAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  campaignName: string;
  campaignDescription?: string;
  actionType: 'CASH_BACK' | 'GIFT_NOTIFICATION';
  actionValue: string;
  startTime: string;
  endTime: string;
  campaignStatus: 'ACTIVE' | 'INACTIVE' | 'UPCOMING';
}

export interface PageResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
}

export const campaignService = {
  /** Claim phần thưởng campaign */
  claimCampaign: async (campaignId: string) => {
    const response = await axiosClient.post(
      `${SERVICE_PREFIX.CAMPAIGN}/v1/campaigns/${campaignId}/claim`,
      null,
      {
        headers: {
          'X-Device-Id': localStorage.getItem('device_id') || 'unknown',
        },
      }
    );
    return response.data;
  },

  /** Lấy danh sách campaign ACTIVE để user pick vào tranh giành */
  getActiveCampaigns: async (
    page = 1,
    size = 10,
    keyword?: string,
    sort?: string
  ): Promise<PageResponse<CampaignResponse>> => {
    const params: Record<string, string | number> = { page, size };
    if (keyword) params.keyword = keyword;
    if (sort) params.sort = sort;
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.CAMPAIGN}/v1/campaigns/active`,
      { params }
    );
    return response.data;
  },

  /** Lấy lịch sử campaign đã tham gia (join thông tin campaign, không N+1) */
  getMyHistory: async (
    page = 1,
    size = 10,
    sort?: string
  ): Promise<PageResponse<CampaignHistoryDetailResponse>> => {
    const params: Record<string, string | number> = { page, size };
    if (sort) params.sort = sort;
    const response = await axiosClient.get(
      `${SERVICE_PREFIX.CAMPAIGN}/v1/campaigns/my-history`,
      { params }
    );
    return response.data;
  },
};