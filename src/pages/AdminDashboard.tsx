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
  Shield,
  UserCog,
  Megaphone,
  Settings,
  AlertTriangle,
  RefreshCw,
  Crown,
  Tag,
  Gift,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { PromoCodesManager } from '@/components/admin/PromoCodesManager';
import { BonusesManager } from '@/components/admin/BonusesManager';
import { AIInsightsDashboard } from '@/components/admin/AIInsightsDashboard';

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
  profile_id: string | null;
  telegram_id: number | null;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalMargin: number;
  pendingOrders: number;
}

interface UserWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telegram_username: string | null;
  roles: string[];
}

interface Supplier {
  id: string;
  shop_name: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  markup_percentage: number | null;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, sessionToken, isAuthenticated } = useTelegramAuth();
  const [activeTab, setActiveTab] = useState('moderation');
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customMarkup, setCustomMarkup] = useState<Record<string, number>>({});
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalMargin: 0,
    pendingOrders: 0,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
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

        const hasAdminAccess = roles?.some(r => 
          r.role === 'admin' || r.role === 'moderator'
        );
        
        setIsAdmin(hasAdminAccess || false);
      } catch (err) {
        console.error('Error checking admin access:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [profile?.id]);

  // Fetch data
  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
      fetchOrderStats();
      fetchSuppliers();
      fetchUsersWithRoles();
    }
  }, [isAdmin]);

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

      const stats: OrderStats = {
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        totalMargin: 0,
        pendingOrders: orders?.filter((o) => o.status === 'pending').length || 0,
      };

      stats.totalMargin = Math.round(stats.totalRevenue * 0.2);
      setOrderStats(stats);
    } catch (err) {
      console.error('Error fetching order stats:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, shop_name, company_name, contact_name, is_active, markup_percentage, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchUsersWithRoles = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, telegram_username')
        .limit(100);

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRolesList: UserWithRole[] = (profiles || []).map(p => ({
        ...p,
        roles: (roles || [])
          .filter(r => r.user_id === p.id)
          .map(r => r.role),
      }));

      // Only show users who have roles (moderators, suppliers, admins)
      const usersWithAnyRole = usersWithRolesList.filter(u => u.roles.length > 0);
      setUsersWithRoles(usersWithAnyRole);
    } catch (err) {
      console.error('Error fetching users with roles:', err);
    }
  };

  const handleApprove = async (application: SupplierApplication, assignRole: string = 'supplier') => {
    setProcessingId(application.id);
    try {
      const markup = customMarkup[application.id] || 33;

      const { data, error } = await supabase.functions.invoke('process-supplier-application', {
        body: {
          application_id: application.id,
          action: 'approve',
          markup_percentage: markup,
          session_token: sessionToken,
          assign_role: assignRole,
        },
      });

      if (error) throw error;

      toast.success(`Постачальника "${application.shop_name}" схвалено з роллю ${assignRole}!`);
      setApplications((prev) => prev.filter((a) => a.id !== application.id));
      fetchSuppliers();
      fetchUsersWithRoles();
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

  const handleToggleSupplierStatus = async (supplierId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: !isActive })
        .eq('id', supplierId);

      if (error) throw error;
      
      toast.success(isActive ? 'Постачальника деактивовано' : 'Постачальника активовано');
      fetchSuppliers();
    } catch (err) {
      console.error('Error toggling supplier status:', err);
      toast.error('Помилка зміни статусу');
    }
  };

  const handleAddRole = async (userId: string, role: 'admin' | 'moderator' | 'supplier' | 'customer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });

      if (error) {
        if (error.code === '23505') {
          toast.error('Користувач вже має цю роль');
          return;
        }
        throw error;
      }

      toast.success(`Роль "${role}" додано`);
      fetchUsersWithRoles();
    } catch (err) {
      console.error('Error adding role:', err);
      toast.error('Помилка додавання ролі');
    }
  };

  const handleRemoveRole = async (userId: string, role: 'admin' | 'moderator' | 'supplier' | 'customer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Роль "${role}" видалено`);
      fetchUsersWithRoles();
    } catch (err) {
      console.error('Error removing role:', err);
      toast.error('Помилка видалення ролі');
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

  // Access denied screen
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Доступ заборонено</h1>
          <p className="text-muted-foreground">
            Ця сторінка доступна лише адміністраторам та модераторам
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
                <Crown className="h-5 w-5 text-warning" />
                Адмін-панель
              </h1>
              <p className="text-xs text-muted-foreground">Управління платформою Taverna</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            fetchApplications();
            fetchSuppliers();
            fetchUsersWithRoles();
            fetchOrderStats();
            toast.success('Дані оновлено');
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
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
          <TabsList className="w-full grid grid-cols-6 mb-4">
            <TabsTrigger value="moderation" className="text-xs px-1">
              <Users className="h-4 w-4" />
              {applications.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {applications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs px-1">
              <Package className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="promos" className="text-xs px-1">
              <Tag className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="text-xs px-1">
              <Gift className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="text-xs px-1">
              <Brain className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="roles" className="text-xs px-1">
              <UserCog className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-4 pr-4">
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
                            <p className="text-foreground truncate">{app.email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Телефон:</span>
                            <p className="text-foreground">{app.phone}</p>
                          </div>
                        </div>

                        {/* AI Analysis */}
                        {(app.reseller_probability !== null || app.plagiarism_score !== null) && (
                          <div className="flex gap-2 flex-wrap">
                            {app.reseller_probability !== null && (
                              <Badge
                                variant={app.reseller_probability > 50 ? 'destructive' : 'secondary'}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
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
                              <span className="text-sm text-muted-foreground">ЄДРПОУ:</span>
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

                            {/* Role Selection */}
                            <div className="space-y-2">
                              <Label className="text-sm">Призначити роль при схваленні</Label>
                              <Select
                                value={selectedRole[app.id] || 'supplier'}
                                onValueChange={(value) => setSelectedRole(prev => ({ ...prev, [app.id]: value }))}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Оберіть роль" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="supplier">Постачальник (supplier)</SelectItem>
                                  <SelectItem value="moderator">Модератор (moderator)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Модератор може переглядати заявки та керувати товарами
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
                            onClick={() => handleApprove(app, selectedRole[app.id] || 'supplier')}
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
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3 pr-4">
                {suppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Немає зареєстрованих постачальників</p>
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <Card key={supplier.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground truncate">{supplier.shop_name}</h3>
                              <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                                {supplier.is_active ? 'Активний' : 'Неактивний'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{supplier.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Націнка: {supplier.markup_percentage || 33}% • {formatDate(supplier.created_at)}
                            </p>
                          </div>
                          <Switch
                            checked={supplier.is_active}
                            onCheckedChange={() => handleToggleSupplierStatus(supplier.id, supplier.is_active)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3 pr-4">
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Керування ролями
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      <strong>admin</strong> — повний доступ до системи<br/>
                      <strong>moderator</strong> — модерація заявок та товарів<br/>
                      <strong>supplier</strong> — доступ до панелі постачальника<br/>
                      <strong>customer</strong> — звичайний покупець
                    </p>
                  </CardContent>
                </Card>

                {usersWithRoles.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Немає користувачів з особливими ролями</p>
                  </div>
                ) : (
                  usersWithRoles.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {user.first_name || ''} {user.last_name || ''}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {user.telegram_username ? `@${user.telegram_username}` : user.email || 'Без контактів'}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="default" className="gap-1">
                              {role}
                              <button
                                onClick={() => handleRemoveRole(user.id, role as 'admin' | 'moderator' | 'supplier' | 'customer')}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Select onValueChange={(value: 'admin' | 'moderator' | 'supplier' | 'customer') => handleAddRole(user.id, value)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Додати роль..." />
                            </SelectTrigger>
                            <SelectContent>
                              {['admin', 'moderator', 'supplier', 'customer']
                                .filter(r => !user.roles.includes(r))
                                .map((role) => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Promos Tab */}
          <TabsContent value="promos">
            <PromoCodesManager />
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses">
            <BonusesManager />
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights">
            <AIInsightsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}