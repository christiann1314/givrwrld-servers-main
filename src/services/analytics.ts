// Analytics Service - MySQL-backed
// Replaces Supabase analytics with MySQL API

import api from '@/lib/api';

export interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      // Get current user from API if not provided
      let userId = event.user_id;
      if (!userId) {
        try {
          const user = await api.getCurrentUser();
          userId = user?.data?.user?.id;
        } catch (error) {
          // User not authenticated, continue without user_id
          console.debug('No authenticated user for analytics event');
        }
      }

      const eventData = {
        event_type: event.event_type,
        user_id: userId || null,
        properties: event.properties || {},
        timestamp: event.timestamp || new Date().toISOString(),
      };

      // Send to MySQL API
      // Note: Analytics endpoint needs to be implemented in API server
      // For now, log to console in development
      if (import.meta.env.DEV) {
        console.log('📊 Analytics Event:', eventData);
      }

      // TODO: Implement analytics endpoint in API server
      // await api.post('/analytics/events', eventData);
    } catch (error) {
      console.error('Analytics service error:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  // Specific event tracking methods
  async trackUserSignup(userData: any): Promise<void> {
    await this.track({
      event_type: 'user_signup',
      properties: {
        email: userData.email,
        first_name: userData.firstName || userData.first_name,
        last_name: userData.lastName || userData.last_name,
        registration_method: 'email'
      }
    });
  }

  async trackUserRegistration(userData: any): Promise<void> {
    await this.track({
      event_type: 'user_registration',
      properties: {
        email: userData.email,
        first_name: userData.firstName || userData.first_name,
        last_name: userData.lastName || userData.last_name,
        registration_method: 'email'
      }
    });
  }

  async trackUserLogin(userId: string): Promise<void> {
    await this.track({
      event_type: 'user_login',
      user_id: userId,
      properties: {
        login_method: 'email'
      }
    });
  }

  async trackAffiliateJoin(userId: string, affiliateCode?: string): Promise<void> {
    await this.track({
      event_type: 'affiliate_join',
      user_id: userId,
      properties: {
        affiliate_code: affiliateCode
      }
    });
  }

  async trackServerPurchase(userId: string, serverData: any): Promise<void> {
    await this.track({
      event_type: 'server_purchase',
      user_id: userId,
      properties: {
        server_type: serverData.game,
        server_specs: serverData.specs,
        price: serverData.price,
        payment_method: serverData.payment_method
      }
    });
  }

  async trackBillingUpdate(userId: string, billingData: any): Promise<void> {
    await this.track({
      event_type: 'billing_update',
      user_id: userId,
      properties: {
        billing_action: billingData.action,
        amount: billingData.amount,
        currency: billingData.currency
      }
    });
  }

  async trackGamePanelAccess(userId: string, serverId: string): Promise<void> {
    await this.track({
      event_type: 'game_panel_access',
      user_id: userId,
      properties: {
        server_id: serverId,
        access_method: 'ui_dashboard'
      }
    });
  }

  async trackServerAction(userId: string, serverId: string, action: string): Promise<void> {
    await this.track({
      event_type: 'server_action',
      user_id: userId,
      properties: {
        server_id: serverId,
        action: action
      }
    });
  }

  async trackSupportTicket(userId: string, ticketData: any): Promise<void> {
    await this.track({
      event_type: 'support_ticket',
      user_id: userId,
      properties: {
        ticket_type: ticketData.type,
        priority: ticketData.priority,
        subject: ticketData.subject
      }
    });
  }
}

export const analytics = AnalyticsService.getInstance();
