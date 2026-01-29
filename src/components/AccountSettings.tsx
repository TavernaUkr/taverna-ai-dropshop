import { useState } from "react";
import { SettingsMainPage } from "@/components/settings/SettingsMainPage";
import { PersonalDataPage } from "@/components/settings/PersonalDataPage";
import { DeliveryAddressesPage } from "@/components/settings/DeliveryAddressesPage";

interface Profile {
  id: string;
  telegram_id?: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  user_type?: 'customer' | 'supplier';
}

interface DeliveryAddress {
  id: string;
  is_default: boolean;
  recipient_name: string;
  phone: string;
  delivery_service: string;
  city: string;
  city_ref?: string;
  delivery_type: string;
  warehouse_number?: string;
  warehouse_ref?: string;
  street_address?: string;
  building_number?: string;
  apartment?: string;
  notes?: string;
}

interface AccountSettingsProps {
  profile: Profile | null;
  addresses: DeliveryAddress[];
  onBack: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<any>;
  onAddAddress: (address: Omit<DeliveryAddress, 'id'>) => Promise<any>;
  onUpdateAddress: (id: string, updates: Partial<DeliveryAddress>) => Promise<any>;
  onDeleteAddress: (id: string) => Promise<boolean>;
}

type SettingsView = 'main' | 'personal' | 'addresses';

export const AccountSettings = ({
  profile,
  addresses,
  onBack,
  onUpdateProfile,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
}: AccountSettingsProps) => {
  const [view, setView] = useState<SettingsView>('main');

  // Main Settings View
  if (view === 'main') {
    return (
      <SettingsMainPage
        profile={profile}
        addressCount={addresses.length}
        onBack={onBack}
        onNavigate={(newView) => setView(newView)}
      />
    );
  }

  // Personal Data View
  if (view === 'personal') {
    return (
      <PersonalDataPage
        profile={profile}
        onBack={() => setView('main')}
        onUpdateProfile={onUpdateProfile}
      />
    );
  }

  // Addresses View
  if (view === 'addresses') {
    return (
      <DeliveryAddressesPage
        addresses={addresses}
        profile={profile}
        onBack={() => setView('main')}
        onAddAddress={onAddAddress}
        onUpdateAddress={onUpdateAddress}
        onDeleteAddress={onDeleteAddress}
      />
    );
  }

  return null;
};
