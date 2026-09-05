import { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home, Target, Zap, MessageCircle, User, type LucideIcon } from 'lucide-react-native';
import { AppState, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { springPresets } from '@/lib/springPresets';
import { syncEntitlements } from '@/lib/entitlementsRefresh';

function AnimatedTabIcon({ focused, color, Icon }: { focused: boolean; color: string; Icon: LucideIcon }) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, springPresets.entrance);
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.18]) }],
  }));

  return (
    <View className="w-16 h-9 items-center justify-center">
      <Animated.View className="absolute w-16 h-9 rounded-2xl bg-primary-container" style={pillStyle} />
      <Animated.View style={iconStyle}>
        <Icon
          size={24}
          color={focused ? '#1D4ED8' : color}
          fill={focused ? '#1D4ED8' : 'none'}
          strokeWidth={focused ? 2.2 : 1.6}
        />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation('common');
  const refreshActiveMissions = useStore((state) => state.refreshActiveMissions);
  const checkAndUpdateStreak = useStore((state) => state.checkAndUpdateStreak);
  const refreshNotifications = useStore((state) => state.refreshNotifications);
  const syncNotificationPermission = useStore((state) => state.syncNotificationPermission);
  const recordActivity = useStore((state) => state.recordActivity);
  const retentionRequiredFor = useStore((state) => state.retentionRequiredFor);
  const router = useRouter();
  const promptedRetentionFor = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    refreshActiveMissions();
    checkAndUpdateStreak();
    recordActivity();
    syncNotificationPermission().then(refreshNotifications);
    syncEntitlements({ signal: controller.signal });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshActiveMissions();
        checkAndUpdateStreak();
        recordActivity();
        syncNotificationPermission().then(refreshNotifications);
        syncEntitlements({ signal: controller.signal });
      }
    });
    return () => {
      sub.remove();
      controller.abort();
    };
  }, []);

  /**
   * A downgrade made on the web can leave more active goals than the new plan
   * allows; the sync records that in `retentionRequiredFor` and this prompts for
   * the choice. Fired at most once per plan per session (the ref) so dismissing
   * the modal doesn't immediately re-open it — the flag stays set, so the ask
   * comes back on the next launch until it's resolved.
   */
  useEffect(() => {
    if (!retentionRequiredFor || promptedRetentionFor.current === retentionRequiredFor) return;
    promptedRetentionFor.current = retentionRequiredFor;
    router.push({ pathname: '/downgrade-selection', params: { target: retentionRequiredFor } });
  }, [retentionRequiredFor]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused} color={color} Icon={Home} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: t('tabs.goals'),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused} color={color} Icon={Target} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: t('tabs.missions'),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused} color={color} Icon={Zap} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t('tabs.coach'),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused} color={color} Icon={MessageCircle} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused} color={color} Icon={User} />,
        }}
      />
    </Tabs>
  );
}
