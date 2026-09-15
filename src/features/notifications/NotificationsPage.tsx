import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AppNotification } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.results as AppNotification[];
    }
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    }
  });

  const notifications = data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" /> Notifications Centre
          </h1>
          <p className="text-sm text-gray-500">Document expiry alerts, pending expense claims, and operational updates</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700">No Notifications</h3>
              <p className="text-xs text-gray-400 mt-1">You're all caught up with your fleet updates</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((item) => (
            <Card key={item.id} className={`transition-colors ${!item.read ? 'border-l-4 border-l-blue-600 bg-blue-50/20' : 'opacity-80'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full mt-0.5 ${
                    item.type === 'docExpiry' ? 'bg-red-100 text-red-600' :
                    item.type === 'expenseSubmitted' ? 'bg-purple-100 text-purple-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {item.type === 'docExpiry' ? <AlertTriangle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm ${!item.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {item.linkTo && (
                  <Link to={item.linkTo}>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      View <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}