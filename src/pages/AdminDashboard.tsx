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
  AlertTriangle,
  RefreshCw,
  Crown,
  Tag,
  Gift,
  Brain,
  MessageSquare,
  Trophy,
  UserPlus,
  Store,
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
import { useTelegramAuthContext } from '@/components/TelegramAuthProvider';
import { hapticSelection } from '@/lib/haptics';
import { PromoCodesManager } from '@/components/admin/PromoCodesManager';
import { BonusesManager } from '@/components/admin/BonusesManager';
import { AIInsightsDashboard } from '@/components/admin/AIInsightsDashboard';
import { ManualSupplierForm } from '@/components/admin/ManualSupplierForm';
import { SupportChatsViewer } from '@/components/admin/SupportChatsViewer';
import { GiveawaysManager } from '@/components/admin/GiveawaysManager';
import { AdminStoreManager } from '@/components/admin/AdminStoreManager';
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
  openTickets: number;
}

interface UserWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
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
  const {
    isLoading: authLoading,
    rolesLoading,
    isAuthenticated,
    roles,
    sessionToken,
    realProfile,
  } = useTelegramAuthContext();
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
    openTickets: 0,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [newUserSearch, setNewUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithRole[]>([]);

  const isAdmin = isAuthenticated && roles.includes('admin');

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
      const [ordersResult, ticketsResult] = await Promise.all([
        supabase.from('orders').select('id, total, subtotal, status'),
        supabase.from('support_tickets').select('id').eq('status', 'open'),
      ]);

      const orders = ordersResult.data || [];
      const tickets = ticketsResult.data || [];

      const stats: OrderStats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalMargin: 0,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        openTickets: tickets.length,
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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_safe' as any)
        .select('id, first_name, last_name')
        .limit(100);

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRolesList: UserWithRole[] = ((profiles || []) as any[]).map((p: any) => ({
        ...p,
        roles: (roles || [])
          .filter(r => r.user_id === p.id)
          .map(r => r.role),
      }));

      const usersWithAnyRole = usersWithRolesList.filter(u => u.roles.length > 0);
      setUsersWithRoles(usersWithAnyRole);
    } catch (err) {
      console.error('Error fetching users with roles:', err);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles_safe' as any)
        .select('id, first_name, last_name')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      const { data: roles } = await supabase.from('user_roles').select('user_id, role');

      const results: UserWithRole[] = ((profiles || []) as any[]).map((p: any) => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.id).map(r => r.role),
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
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
      setSearchResults([]);
      setNewUserSearch('');
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
  if (authLoading || rolesLoading) {
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
            Ця сторінка доступна лише адміністраторам
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
              <p className="text-xs text-muted-foreground">Повний контроль платформи Taverna</p>
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
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orderStats.openTickets}</p>
                <p className="text-xs text-muted-foreground">Тікетів</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{suppliers.length}</p>
                <p className="text-xs text-muted-foreground">Партнерів</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(value) => {
          hapticSelection();
          setActiveTab(value);
        }}>
          <ScrollArea className="w-full pb-2">
            <TabsList className="w-max flex gap-1 mb-4">
              <TabsTrigger value="moderation" className="text-xs px-3 gap-1">
                <Users className="h-4 w-4" />
                Заявки
                {applications.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {applications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="text-xs px-3 gap-1">
                <Package className="h-4 w-4" />
                Партнери
              </TabsTrigger>
              <TabsTrigger value="stores" className="text-xs px-3 gap-1">
                <Store className="h-4 w-4" />
                Магазини
              </TabsTrigger>
              <TabsTrigger value="register" className="text-xs px-3 gap-1">
                <UserPlus className="h-4 w-4" />
                Реєстрація
              </TabsTrigger>
              <TabsTrigger value="chats" className="text-xs px-3 gap-1">
                <MessageSquare className="h-4 w-4" />
                Чати
              </TabsTrigger>
              <TabsTrigger value="giveaways" className="text-xs px-3 gap-1">
                <Trophy className="h-4 w-4" />
                Розіграші
              </TabsTrigger>
              <TabsTrigger value="promos" className="text-xs px-3 gap-1">
                <Tag className="h-4 w-4" />
                Промо
              </TabsTrigger>
              <TabsTrigger value="bonuses" className="text-xs px-3 gap-1">
                <Gift className="h-4 w-4" />
                Бонуси
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="text-xs px-3 gap-1">
                <Brain className="h-4 w-4" />
                AI
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-xs px-3 gap-1">
                <UserCog className="h-4 w-4" />
                Ролі
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

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
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{app.shop_name}</h3>
                            <p className="text-sm text-muted-foreground">{app.full_name}</p>
                          </div>
                          <Badge variant={app.supplier_type === 'individual' ? 'secondary' : 'outline'}>
                            {app.supplier_type === 'individual' ? 'ФОП' : 'ТОВ'}
                          </Badge>
                        </div>

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

                        {(app.reseller_probability !== null || app.plagiarism_score !== null) && (
                          <div className="flex gap-2 flex-wrap">
                            {app.reseller_probability !== null && (
                              <Badge variant={app.reseller_probability > 50 ? 'destructive' : 'secondary'}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Ресейлер: {app.reseller_probability}%
                              </Badge>
                            )}
                            {app.plagiarism_score !== null && (
                              <Badge variant={app.plagiarism_score > 30 ? 'destructive' : 'secondary'}>
                                Плагіат: {app.plagiarism_score}%
                              </Badge>
                            )}
                          </div>
                        )}

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
                            </div>

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
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Причина відхилення</Label>
                              <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Вкажіть причину відхилення..."
                                rows={2}
                              />
                            </div>
                          </div>
                        )}

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

          {/* Manual Registration Tab */}
          <TabsContent value="register">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="pr-4">
                <ManualSupplierForm onSuccess={() => { fetchSuppliers(); }} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Admin Store Manager Tab */}
          <TabsContent value="stores">
            <AdminStoreManager />
          </TabsContent>

          {/* Support Chats Tab */}
          <TabsContent value="chats">
            <SupportChatsViewer />
          </TabsContent>

          {/* Giveaways Tab */}
          <TabsContent value="giveaways">
            <GiveawaysManager />
          </TabsContent>

          {/* Promo Codes Tab */}
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

          {/* Roles Tab */}
          <TabsContent value="roles">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Керування ролями
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>admin</strong> — повний доступ до системи<br/>
                      <strong>moderator</strong> — модерація заявок, спорів, підтримка<br/>
                      <strong>supplier</strong> — доступ до панелі постачальника<br/>
                      <strong>customer</strong> — звичайний покупець
                    </p>

                    {/* Add new role to user */}
                    <div className="space-y-2">
                      <Label className="text-sm">Додати роль користувачу</Label>
                      <Input
                        value={newUserSearch}
                        onChange={(e) => {
                          setNewUserSearch(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        placeholder="Пошук за ім'ям або @username..."
                      />
                      {searchResults.length > 0 && (
                        <div className="border rounded-lg p-2 space-y-1">
                          {searchResults.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                              <div>
                                <p className="text-sm font-medium">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {user.id.slice(0, 8)}…
                                </p>
                              </div>
                              <Select onValueChange={(v: 'admin' | 'moderator' | 'supplier' | 'customer') => handleAddRole(user.id, v)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Роль..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">admin</SelectItem>
                                  <SelectItem value="moderator">moderator</SelectItem>
                                  <SelectItem value="supplier">supplier</SelectItem>
                                  <SelectItem value="customer">customer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                            ID: {user.id.slice(0, 8)}…
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
        </Tabs>
      </div>
    </div>
  );
}
