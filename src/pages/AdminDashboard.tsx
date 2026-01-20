import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Check,
  X,
  Loader2,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupplierApplication {
  id: string;
  shop_name: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string | null;
  supplier_type: string;
  tax_id: string;
  description: string | null;
  xml_url: string | null;
  status: string;
  created_at: string;
  reseller_probability: number | null;
  plagiarism_score: number | null;
  suggested_categories: string[] | null;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalMargin: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('moderation');
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customMarkup, setCustomMarkup] = useState<Record<string, number>>({});
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalMargin: 0,
    pendingOrders: 0,
  });

  // Fetch pending supplier applications
  useEffect(() => {
    fetchApplications();
    fetchOrderStats();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Помилка завантаження заявок');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderStats = async () => {
    try {
      // Fetch orders with items to calculate margin
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          subtotal,
          status,
          order_items (
            price,
            quantity,
            product_id
          )
        `);

      if (error) throw error;

      // Calculate stats
      const stats: OrderStats = {
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        totalMargin: 0, // Will be calculated from price difference
        pendingOrders: orders?.filter((o) => o.status === 'pending').length || 0,
      };

      // Estimate margin at ~25% average markup
      stats.totalMargin = Math.round(stats.totalRevenue * 0.2);

      setOrderStats(stats);
    } catch (err) {
      console.error('Error fetching order stats:', err);
    }
  };

  const handleApprove = async (application: SupplierApplication) => {
    setProcessingId(application.id);
    try {
      const markup = customMarkup[application.id] || 33;

      // Call edge function to process application
      const { data, error } = await supabase.functions.invoke('process-supplier-application', {
        body: {
          application_id: application.id,
          action: 'approve',
          markup_percentage: markup,
        },
      });

      if (error) throw error;

      toast.success(`Постачальника "${application.shop_name}" схвалено!`);
      setApplications((prev) => prev.filter((a) => a.id !== application.id));
    } catch (err) {
      console.error('Error approving application:', err);
      toast.error('Помилка схвалення заявки');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (application: SupplierApplication) => {
    if (!rejectionReason.trim()) {
      toast.error('Вкажіть причину відхилення');
      return;
    }

    setProcessingId(application.id);
    try {
      const { error } = await supabase
        .from('supplier_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (error) throw error;

      toast.success('Заявку відхилено');
      setApplications((prev) => prev.filter((a) => a.id !== application.id));
      setRejectionReason('');
      setExpandedId(null);
    } catch (err) {
      console.error('Error rejecting application:', err);
      toast.error('Помилка відхилення заявки');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-foreground">Адмін-панель</h1>
              <p className="text-xs text-muted-foreground">Управління платформою</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orderStats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Замовлень</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {orderStats.totalMargin.toLocaleString()} ₴
                </p>
                <p className="text-xs text-muted-foreground">Прибуток</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {orderStats.totalRevenue.toLocaleString()} ₴
                </p>
                <p className="text-xs text-muted-foreground">Оборот</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orderStats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Очікують</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="moderation">
              <Users className="h-4 w-4 mr-2" />
              Модерація
              {applications.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {applications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 mr-2" />
              Замовлення
            </TabsTrigger>
          </TabsList>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Немає нових заявок</p>
                <p className="text-sm text-muted-foreground">
                  Всі заявки на реєстрацію оброблені
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{app.shop_name}</h3>
                        <p className="text-sm text-muted-foreground">{app.full_name}</p>
                      </div>
                      <Badge variant={app.supplier_type === 'individual' ? 'secondary' : 'outline'}>
                        {app.supplier_type === 'individual' ? 'ФОП' : 'ТОВ'}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="text-foreground">{app.email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Телефон:</span>
                        <p className="text-foreground">{app.phone}</p>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {(app.reseller_probability || app.plagiarism_score) && (
                      <div className="flex gap-2">
                        {app.reseller_probability !== null && (
                          <Badge
                            variant={app.reseller_probability > 50 ? 'destructive' : 'secondary'}
                          >
                            Ресейлер: {app.reseller_probability}%
                          </Badge>
                        )}
                        {app.plagiarism_score !== null && (
                          <Badge
                            variant={app.plagiarism_score > 30 ? 'destructive' : 'secondary'}
                          >
                            Плагіат: {app.plagiarism_score}%
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Expand Toggle */}
                    <button
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      className="flex items-center gap-1 text-sm text-primary"
                    >
                      <Eye className="h-4 w-4" />
                      {expandedId === app.id ? 'Згорнути' : 'Детальніше'}
                      {expandedId === app.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    {expandedId === app.id && (
                      <div className="space-y-4 pt-2 border-t border-border">
                        <div>
                          <span className="text-sm text-muted-foreground">ЄДРПОУ/ІПН:</span>
                          <p className="text-sm text-foreground">{app.tax_id}</p>
                        </div>
                        {app.company_name && (
                          <div>
                            <span className="text-sm text-muted-foreground">Компанія:</span>
                            <p className="text-sm text-foreground">{app.company_name}</p>
                          </div>
                        )}
                        {app.description && (
                          <div>
                            <span className="text-sm text-muted-foreground">Опис:</span>
                            <p className="text-sm text-foreground">{app.description}</p>
                          </div>
                        )}
                        {app.xml_url && (
                          <div>
                            <span className="text-sm text-muted-foreground">XML прайс:</span>
                            <p className="text-sm text-primary truncate">{app.xml_url}</p>
                          </div>
                        )}
                        {app.suggested_categories && app.suggested_categories.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Категорії:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {app.suggested_categories.map((cat, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Заявка від: {formatDate(app.created_at)}
                        </p>

                        {/* Markup Setting */}
                        <div className="space-y-2">
                          <Label className="text-sm">Націнка (%)</Label>
                          <Input
                            type="number"
                            min={20}
                            max={50}
                            value={customMarkup[app.id] || 33}
                            onChange={(e) =>
                              setCustomMarkup((prev) => ({
                                ...prev,
                                [app.id]: parseInt(e.target.value) || 33,
                              }))
                            }
                            className="w-24"
                          />
                          <p className="text-xs text-muted-foreground">
                            Рекомендовано: 33% (до 1000₴), 28% (1-10к₴), 23% (10к+₴)
                          </p>
                        </div>

                        {/* Rejection Reason */}
                        <div className="space-y-2">
                          <Label className="text-sm">Причина відхилення (якщо потрібно)</Label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Вкажіть причину відхилення..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleReject(app)}
                        disabled={processingId === app.id}
                      >
                        <X className="h-4 w-4 mr-1 text-destructive" />
                        Відхилити
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(app)}
                        disabled={processingId === app.id}
                      >
                        {processingId === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Схвалити
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Останні замовлення</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Функціонал замовлень буде доступний у наступному оновленні
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
