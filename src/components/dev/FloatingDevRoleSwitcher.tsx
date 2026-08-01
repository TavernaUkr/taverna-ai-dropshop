import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { DevRoleSwitcher } from "@/components/profile/DevRoleSwitcher";

type TestRole = "guest" | "customer" | "supplier" | "shop_manager" | "moderator" | "admin";

/**
 * Floating "Жук" button available on every preview page,
 * so roles can be switched from admin panel, balance, manager, etc.
 */
export const FloatingDevRoleSwitcher = () => {
  const { canUseDevRoleSwitcher, effectiveRole, setDevRoleOverride, realProfile } =
    useTelegramAuthContext();

  if (!canUseDevRoleSwitcher) return null;

  return (
    <div className="fixed bottom-28 right-3 z-[60]">
      <DevRoleSwitcher
        currentRole={effectiveRole as TestRole}
        onRoleChange={(r) => setDevRoleOverride(r as TestRole)}
        profileId={realProfile?.id}
      />
    </div>
  );
};
