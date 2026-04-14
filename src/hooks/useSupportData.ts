import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created: string;
  updated: string;
  responses: number;
}

interface SupportData {
  tickets: SupportTicket[];
  loading: boolean;
}

function mapApiTicketRow(row: any): SupportTicket {
  return {
    id: String(row.id),
    subject: row.subject ?? '',
    category: row.category ?? 'general',
    priority: row.priority === 'normal' ? 'medium' : String(row.priority ?? 'medium'),
    status: String(row.status ?? 'open'),
    created: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
    updated: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '',
    responses: typeof row.message_count === 'number' ? row.message_count : 0,
  };
}

export const useSupportData = (userEmail?: string) => {
  const [supportData, setSupportData] = useState<SupportData>({
    tickets: [],
    loading: false
  });
  // toast is now imported directly from sonner

  const fetchSupportData = async () => {
    if (!userEmail) return;

    setSupportData((prev) => ({ ...prev, loading: true }));

    try {
      const [ticketsResult, ordersResult] = await Promise.allSettled([
        api.http<{ success?: boolean; tickets?: any[] }>('/api/tickets', { method: 'GET' }),
        api.getOrders(),
      ]);

      let apiTickets: SupportTicket[] = [];
      if (ticketsResult.status === 'fulfilled') {
        const raw = ticketsResult.value;
        if (raw?.success && Array.isArray(raw.tickets)) {
          apiTickets = raw.tickets.map(mapApiTicketRow);
        }
      } else {
        console.error('Failed to fetch tickets:', ticketsResult.reason);
      }

      let orderTickets: SupportTicket[] = [];
      if (ordersResult.status === 'fulfilled') {
        const response = ordersResult.value;
        const orders = response?.success ? response?.orders || [] : [];
        const issueOrders = orders.filter((o: any) => o.status === 'error' || o.status === 'provisioning');
        orderTickets = issueOrders.map((order: any) => ({
          id: String(order.id),
          subject: `Provisioning issue: ${order.server_name || order.plan_id}`,
          category: 'technical',
          priority: order.status === 'error' ? 'high' : 'medium',
          status: order.status === 'error' ? 'open' : 'pending',
          created: new Date(order.created_at).toLocaleDateString(),
          updated: new Date(order.updated_at || order.created_at).toLocaleDateString(),
          responses: 0,
        }));
      } else {
        console.error('Failed to fetch orders for support:', ordersResult.reason);
      }

      setSupportData({
        tickets: [...apiTickets, ...orderTickets],
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch support data:', error);
      setSupportData({
        tickets: [],
        loading: false,
      });
    }
  };

  const createTicket = async (ticketData: {
    subject: string;
    category: string;
    priority: string;
    description: string;
  }) => {
    if (!userEmail) return false;

    try {
      const priorityForApi =
        ticketData.priority === 'medium'
          ? 'normal'
          : ['low', 'normal', 'high'].includes(ticketData.priority)
            ? ticketData.priority
            : 'normal';

      await api.http('/api/tickets', {
        method: 'POST',
        body: {
          subject: ticketData.subject,
          message: ticketData.description,
          priority: priorityForApi,
          category: ticketData.category,
        },
      });

      await fetchSupportData();
      toast({
        title: 'Ticket created',
        description: 'Your support ticket was submitted successfully.',
      });
      return true;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      const description =
        error instanceof Error ? error.message : 'Failed to create support ticket';
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchSupportData();
    }
  }, [userEmail]);

  return { supportData, createTicket, refetchSupport: fetchSupportData };
};