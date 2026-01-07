import Constants from 'expo-constants';
import { getErrorMessage } from '@/utils/errorUtils';

const BECKN_GATEWAY_URL =
  Constants.expoConfig?.extra?.becknGatewayUrl ||
  process.env.BECKN_GATEWAY_URL ||
  'https://gateway.becknprotocol.io';

const BECKN_DOMAIN = Constants.expoConfig?.extra?.becknDomain || process.env.BECKN_DOMAIN || 'energy';

export interface BecknSearchRequest {
  context: {
    domain: string;
    action: string;
    location?: {
      city?: {
        name: string;
      };
      country?: {
        code: string;
      };
    };
  };
  message: {
    intent: {
      item: {
        descriptor: {
          name: string;
        };
      };
      fulfillment?: {
        type: string;
      };
    };
  };
}

export interface BecknSearchResponse {
  context: {
    transaction_id: string;
    message_id: string;
  };
  message: {
    catalog: {
      'bpp/providers': Array<{
        id: string;
        descriptor: {
          name: string;
        };
        locations: Array<{
          id: string;
          gps: string;
        }>;
        items: Array<{
          id: string;
          descriptor: {
            name: string;
            price: {
              currency: string;
              value: string;
            };
          };
        }>;
      }>;
    };
  };
}

class BecknClient {
  private gatewayUrl: string;
  private domain: string;

  constructor(gatewayUrl: string = BECKN_GATEWAY_URL, domain: string = BECKN_DOMAIN) {
    this.gatewayUrl = gatewayUrl;
    this.domain = domain;
  }

  /**
   * Search for energy providers using Beckn Protocol
   */
  async search(request: BecknSearchRequest): Promise<BecknSearchResponse> {
    try {
      const response = await fetch(`${this.gatewayUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          context: {
            ...request.context,
            domain: this.domain,
          },
        }),
      });

      if (!response.ok) {
        // Check if response is HTML (error page)
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
          throw new Error(`Beckn gateway returned non-JSON response (likely not configured)`);
        }
        throw new Error(`Beckn search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      // Improve error message
      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes('JSON Parse error') || errorMsg.includes('Unexpected character')) {
        throw new Error('Beckn gateway not available or not configured');
      }
      throw new Error(`Beckn search error: ${errorMsg}`);
    }
  }

  /**
   * Initialize an order
   */
  async initOrder(orderData: any): Promise<any> {
    // TODO: Implement order initialization
    throw new Error('Not implemented');
  }

  /**
   * Confirm an order
   */
  async confirmOrder(orderId: string): Promise<any> {
    // TODO: Implement order confirmation
    throw new Error('Not implemented');
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    // TODO: Implement order status check
    throw new Error('Not implemented');
  }
}

export const becknClient = new BecknClient();

