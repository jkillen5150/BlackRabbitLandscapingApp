import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAV_HEIGHT } from '@/constants/theme';

/** Bottom nav clearance so content isn't hidden behind the floating bar. */
export function useTopTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  // Function name kept for existing imports; now returns *bottom* clearance.
  return APP_NAV_HEIGHT + Math.max(insets.bottom, 8) + 20;
}

export function useBottomNavClearance(): number {
  return useTopTabBarHeight();
}
