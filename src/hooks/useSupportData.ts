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

export const useSupportData = (userEmail?: string) => {
  const [supportData, setSupportData] = useState<SupportData>({
    tickets: [],
    loading: false
  });
  // toast is now imported directly from sonner

  const fetchSupportData = async () => {
    if (!userEmail) return;
    
    setSupportData(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await api.getOrders();
      const orders = response?.success ? (response?.orders || []) : [];
      const issueOrders = orders.filter((o: any) => o.status === 'error' || o.status === 'provisioning');

      const tickets: SupportTicket[] = issueOrders.map((order: any) => ({
        id: String(order.id),
        subject: `Provisioning issue: ${order.server_name || order.plan_id}`,
        category: 'technical',
        priority: order.status === 'error' ? 'high' : 'medium',
        status: order.status === 'error' ? 'open' : 'pending',
        created: new Date(order.created_at).toLocaleDateString(),
        updated: new Date(order.updated_at || order.created_at).toLocaleDateString(),
        responses: 0,
      }));

      setSupportData({
        tickets,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch support data:', error);
      // Fallback to mock data
      setSupportData({
        tickets: [],
        loading: false
      });
    }
  };

  const createTicket = async (_ticketData: {
    subject: string;
    category: string;
    priority: string;
    description: string;
  }) => {
    if (!userEmail) return false;

    try {
      // Support API endpoints are not implemented on local backend yet.
      // Keep UX clear and avoid failing silently.
      toast({
        title: "Support endpoint not wired yet",
        description: "Local backend does not expose ticket creation yet. Existing live issues are still shown from orders.",
      });
      return false;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast({
        title: "Error", 
        description: "Failed to create support ticket",
        variant: "destructive"
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