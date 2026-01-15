import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ShieldCheck, User } from 'lucide-react';

interface TelegramAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: any;
  addresses: any[];
  sessionToken: string | null;
  error: string | null;
  logout: () => Promise<void>;
  updateProfile: (updates: any) => Promise<any>;
  addAddress: (address: any) => Promise<any>;
  updateAddress: (id: string, updates: any) => Promise<any>;
  deleteAddress: (id: string) => Promise<boolean>;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | null>(null);

export function useTelegramAuthContext() {
  const context = useContext(TelegramAuthContext);
  if (!context) {
    throw new Error('useTelegramAuthContext must be used within TelegramAuthProvider');
  }
  return context;
}

interface TelegramAuthProviderProps {
  children: ReactNode;
}

export function TelegramAuthProvider({ children }: TelegramAuthProviderProps) {
  const auth = useTelegramAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(false);
  const [telegramData, setTelegramData] = useState<any>(null);

  // Check for Telegram WebApp on mount
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg?.initDataUnsafe?.user) {
      // We have Telegram user data, show confirmation dialog
      setTelegramData(tg.initDataUnsafe.user);
      
      // If already authenticated, don't show dialog
      if (!auth.isAuthenticated && !auth.isLoading) {
        // Small delay to let the app render first
        setTimeout(() => {
          setShowConfirmDialog(true);
        }, 500);
      }
    }
    
    // Expand Telegram WebApp to full height
    if (tg) {
      tg.expand();
      tg.ready();
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  const handleConfirmAuth = async () => {
    setPendingAuth(true);
    await auth.authenticate();
    setPendingAuth(false);
    setShowConfirmDialog(false);
  };

  const handleDenyAuth = () => {
    setShowConfirmDialog(false);
  };

  const getUserDisplayName = () => {
    if (telegramData) {
      const parts = [telegramData.first_name, telegramData.last_name].filter(Boolean);
      return parts.join(' ') || telegramData.username || 'Користувач Telegram';
    }
    return 'Користувач';
  };

  return (
    <TelegramAuthContext.Provider value={{
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      profile: auth.profile,
      addresses: auth.addresses,
      sessionToken: auth.sessionToken,
      error: auth.error,
      logout: auth.logout,
      updateProfile: auth.updateProfile,
      addAddress: auth.addAddress,
      updateAddress: auth.updateAddress,
      deleteAddress: auth.deleteAddress,
    }}>
      {children}

      {/* Auth Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px] mx-4">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">Вхід через Telegram</DialogTitle>
            <DialogDescription className="pt-2">
              Ви входите як:
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg my-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {telegramData?.photo_url ? (
                <img 
                  src={telegramData.photo_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{getUserDisplayName()}</p>
              {telegramData?.username && (
                <p className="text-sm text-muted-foreground">@{telegramData.username}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Натисніть «Підтвердити» для входу у ваш акаунт Taverna. 
            Ваші дані Telegram будуть використані для створення профілю.
          </p>

          <DialogFooter className="flex gap-2 sm:gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleDenyAuth}
              className="flex-1"
              disabled={pendingAuth}
            >
              Скасувати
            </Button>
            <Button 
              onClick={handleConfirmAuth} 
              className="flex-1"
              disabled={pendingAuth}
            >
              {pendingAuth ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вхід...
                </>
              ) : (
                'Підтвердити'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {auth.isLoading && !showConfirmDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Завантаження...</p>
          </div>
        </div>
      )}
    </TelegramAuthContext.Provider>
  );
}
