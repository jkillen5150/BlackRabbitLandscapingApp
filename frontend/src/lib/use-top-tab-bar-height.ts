import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOP_TAB_BAR_HEIGHT } from '@/components/top-tab-bar';

export function useTopTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_TAB_BAR_HEIGHT;
}