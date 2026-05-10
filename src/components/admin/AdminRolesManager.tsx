import { useState, useEffect, useCallback } from "react";
import {
  Shield, UserCog, X, Loader2, Search, Ban, Clock, AlertTriangle, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/components/TelegramAuthProvider";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  roles: string[];
  activeBan: { id: string; reason: string; expires_at: string | null; banned_at: string } | null;
}

const ALL_ROLES = ["admin", "moderator", "supplier", "shop_manager", "customer"] as const;
type AppRole = typeof ALL_ROLES[number];

const ROLE_LABELS: Record<string, string> = {
  admin: "Адміністратор",
  moderator: "Модератор",
  supplier: "Постачальник",
  shop_manager: "Менеджер магазину",
  customer: "Покупець",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 border-red-500/30",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  supplier: "bg-green-500/10 text-green-600 border-green-500/30",
  shop_manager: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  customer: "bg-muted text-muted-foreground border-border",
};

export function AdminRolesManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [banDialog, setBanDialog] = useState<UserWithRole | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("30");
  const [banUnit, setBanUnit] = useState<"days" | "years">("days");
  const [isBanning, setIsBanning] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profilesRes, rolesRes, bansRes] = await Promise.all([
        supabase.from('profiles_safe' as any).select('id, first_name, last_name, avatar_url').limit(500),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_bans' as any).select('id, profile_id, reason, expires_at, banned_at, is_active').eq('is_active', true),
      ]);

      const profiles = (profilesRes.data || []) as any[];
      const roles = rolesRes.data || [];
      const bans = (bansRes.data || []) as any[];

      const list: UserWithRole[] = profiles.map((p: any) => {
        const userRoles = roles.filter(r => r.user_id === p.id).map(r => r.role);
        const activeBan = bans.find((b: any) => b.profile_id === p.id && b.is_active);
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          roles: userRoles,
          activeBan: activeBan ? {
            id: activeBan.id,
            reason: activeBan.reason,
            expires_at: activeBan.expires_at,
            banned_at: activeBan.banned_at,
          } : null,
        };
      });

      // Sort: admins first, then by roles count, then by name
      list.sort((a, b) => {
        if (a.roles.includes('admin') && !b.roles.includes('admin')) return -1;
        if (!a.roles.includes('admin') && b.roles.includes('admin')) return 1;
        if (b.roles.length !== a.roles.length) return b.roles.length - a.roles.length;
        return (a.first_name || '').localeCompare(b.first_name || '');
      });

      setUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as AppRole });
      if (error) {
        if (error.code === '23505') { toast.error('Вже має цю роль'); return; }
        throw error;
      }
      toast.success(`Роль «${ROLE_LABELS[role]}» додано`);
      fetchUsers();
    } catch { toast.error('Помилка додавання ролі'); }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (role === 'customer') { toast.error('Роль покупця не можна видалити'); return; }
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as AppRole);
      if (error) throw error;
      toast.success(`Роль «${ROLE_LABELS[role]}» видалено`);
      fetchUsers();
    } catch { toast.error('Помилка видалення ролі'); }
  };

  const handleBanUser = async () => {
    if (!banDialog || !banReason.trim()) { toast.error('Вкажіть причину бану'); return; }
    setIsBanning(true);
    try {
      const durationNum = parseInt(banDuration) || 30;
      const now = new Date();
      let expiresAt: Date;
      if (banUnit === 'years') {
        expiresAt = new Date(now.getFullYear() + durationNum, now.getMonth(), now.getDate());
      } else {
        expiresAt = new Date(now.getTime() + durationNum * 24 * 60 * 60 * 1000);
      }

      const { error } = await supabase.from('user_bans' as any).insert({
        profile_id: banDialog.id,
        reason: banReason.trim(),
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      // Deactivate profile
      await supabase.from('profiles').update({ is_active: false } as any).eq('id', banDialog.id);

      toast.success(`Користувача заблоковано на ${durationNum} ${banUnit === 'years' ? 'р.' : 'дн.'}`);
      setBanDialog(null);
      setBanReason('');
      setBanDuration('30');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Помилка бану');
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await supabase.from('user_bans' as any).update({ is_active: false }).eq('profile_id', userId).eq('is_active', true);
      await supabase.from('profiles').update({ is_active: true } as any).eq('id', userId);
      toast.success('Користувача розблоковано');
      fetchUsers();
    } catch { toast.error('Помилка розблокування'); }
  };

  const filteredUsers = users.filter(u => {
    const nameMatch = !searchQuery || 
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.startsWith(searchQuery);
    const roleMatch = filterRole === 'all' || u.roles.includes(filterRole) || (filterRole === 'banned' && u.activeBan);
    return nameMatch && roleMatch;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Керування ролями та банами</p>
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span><strong>admin</strong> — повний доступ</span>
                <span><strong>moderator</strong> — модерація</span>
                <span><strong>supplier</strong> — постачальник</span>
                <span><strong>shop_manager</strong> — менеджер</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Пошук за ім'ям або ID..."
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі ({users.length})</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]} ({users.filter(u => u.roles.includes(r)).length})</SelectItem>
            ))}
            <SelectItem value="banned">🚫 Забанені ({users.filter(u => u.activeBan).length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filteredUsers.length} користувачів</p>

      {/* Users list */}
      <ScrollArea className="h-[calc(100vh-520px)]">
        <div className="space-y-2 pr-4">
          {filteredUsers.map(user => (
            <Card key={user.id} className={user.activeBan ? "border-destructive/30 bg-destructive/5" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(user.first_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {user.first_name || ''} {user.last_name || ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">{user.id.slice(0, 12)}…</p>
                  </div>
                  {user.activeBan ? (
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleUnbanUser(user.id)}>
                      <Check className="h-3 w-3" /> Розбанити
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => {
                      setBanDialog(user);
                      setBanReason('');
                      setBanDuration('30');
                    }}>
                      <Ban className="h-3 w-3" /> Бан
                    </Button>
                  )}
                </div>

                {/* Active ban info */}
                {user.activeBan && (
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs space-y-0.5">
                    <p className="font-medium text-destructive flex items-center gap-1">
                      <Ban className="h-3 w-3" /> Заблоковано
                    </p>
                    <p className="text-muted-foreground">Причина: {user.activeBan.reason}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {user.activeBan.expires_at ? `до ${formatDate(user.activeBan.expires_at)}` : 'Безстроково'}
                    </p>
                  </div>
                )}

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {user.roles.map(role => (
                    <Badge key={role} variant="outline" className={`text-[10px] gap-1 ${ROLE_COLORS[role] || ''}`}>
                      {ROLE_LABELS[role] || role}
                      {role !== 'customer' && (
                        <button onClick={() => handleRemoveRole(user.id, role)} className="ml-0.5 hover:opacity-70">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {user.roles.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">Без ролей</span>
                  )}
                </div>

                {/* Add role */}
                <Select onValueChange={v => handleAddRole(user.id, v)}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="+ Додати роль" /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.filter(r => !user.roles.includes(r)).map(role => (
                      <SelectItem key={role} value={role} className="text-xs">{ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Ban Dialog */}
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Заблокувати користувача
            </DialogTitle>
            <DialogDescription>
              {banDialog?.first_name} {banDialog?.last_name} (ID: {banDialog?.id.slice(0, 12)}…)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-xs text-foreground font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Увага
              </p>
              <p className="text-xs text-muted-foreground">
                Заблокований користувач не зможе користуватись додатком до закінчення терміну бану або до ручного розблокування.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Причина блокування</Label>
              <Textarea
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Підозріла активність з використанням сторонніх програм..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label>Тривалість</Label>
                <Input
                  type="number"
                  min={1}
                  value={banDuration}
                  onChange={e => setBanDuration(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Одиниця</Label>
                <Select value={banUnit} onValueChange={v => setBanUnit(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Днів</SelectItem>
                    <SelectItem value="years">Років</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialog(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={isBanning || !banReason.trim()} className="gap-2">
              {isBanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Заблокувати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
