import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Eye,
  Package,
  RefreshCw,
  MessageSquare,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

interface Report {
  id: string;
  product_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  product?: {
    id: string;
    name: string;
    images: string[] | null;
    price: number;
  };
}

interface PendingProduct {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  in_stock: boolean;
  supplier_id: string;
  created_at: string;
}

export default function ModeratorPanel() {
  const navigate = useNavigate();
  const { profile } = useTelegramAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [isModerator, setIsModerator] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check moderator access
  useEffect(() => {
    const checkAccess = async () => {
      if (!profile?.id) {
        setCheckingAccess(false);
        return;
      }

      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id);

        if (error) throw error;

        const hasAccess = roles?.some(r => 
          r.role === 'admin' || r.role === 'moderator'
        );
        
        setIsModerator(hasAccess || false);
      } catch (err) {
        console.error('Error checking access:', err);
        setIsModerator(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [profile?.id]);

  useEffect(() => {
    if (isModerator) {
      fetchData();
    }
  }, [isModerator]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          product:products(id, name, images, price)
        `)
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Fetch recent products (for review)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, images, in_stock, supplier_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (productsError) throw productsError;
      setPendingProducts(productsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Помилка завантаження даних');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setProcessingId(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: adminNotes[reportId] || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success(status === 'resolved' ? 'Скаргу вирішено' : 'Скаргу відхилено');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Error resolving report:', err);
      toast.error('Помилка обробки скарги');
    } finally {
      setProcessingId(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      counterfeit: 'Підробка',
      inappropriate: 'Неприпустимий вміст',
      wrong_category: 'Неправильна категорія',
      misleading: 'Оманлива інформація',
      other: 'Інше',
    };
    return reasons[reason] || reason;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Доступ заборонено</h1>
          <p className="text-muted-foreground">
            Ця сторінка доступна лише модераторам
          </p>
          <Button onClick={() => navigate('/')}>
            На головну
          </Button>
        </div>
      </div>
    );
  }

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
              <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Панель модератора
              </h1>
              <p className="text-xs text-muted-foreground">Модерація контенту</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Flag className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{reports.length}</p>
                <p className="text-xs text-muted-foreground">Скарг</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingProducts.length}</p>
                <p className="text-xs text-muted-foreground">Товарів</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="h-4 w-4" />
              Скарги
              {reports.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Товари
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-4 pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-success" />
                    </div>
                    <p className="font-medium text-foreground">Немає активних скарг</p>
                    <p className="text-sm text-muted-foreground">Всі скарги оброблені</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-4 space-y-4">
                        {/* Product Info */}
                        <div className="flex items-start gap-3">
                          {report.product?.images?.[0] && (
                            <img
                              src={report.product.images[0]}
                              alt={report.product.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {report.product?.name || 'Товар видалено'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {report.product?.price?.toLocaleString()} ₴
                            </p>
                          </div>
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {getReasonLabel(report.reason)}
                          </Badge>
                        </div>

                        {/* Report Description */}
                        {report.description && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-foreground">{report.description}</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          {formatDate(report.created_at)}
                        </p>

                        {/* Admin Notes */}
                        <Textarea
                          value={adminNotes[report.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Нотатки модератора..."
                          rows={2}
                        />

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                            disabled={processingId === report.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Відхилити
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleResolveReport(report.id, 'resolved')}
                            disabled={processingId === report.id}
                          >
                            {processingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Вирішити
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-3 pr-4">
                {pendingProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Немає товарів для перегляду</p>
                  </div>
                ) : (
                  pendingProducts.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-14 h-14 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.price.toLocaleString()} ₴
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(product.created_at)}
                            </p>
                          </div>
                          <Badge variant={product.in_stock ? 'default' : 'secondary'}>
                            {product.in_stock ? 'В наявності' : 'Немає'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
