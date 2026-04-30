import { Tabs } from 'expo-router';
import { Home, Target, Zap, MessageCircle, User } from 'lucide-react-native';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1f1f22',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-16 h-8 items-center justify-center rounded-full ${focused ? 'bg-[#064e3b]' : ''}`}>
              <Home size={22} color={focused ? '#34d399' : color} strokeWidth={focused ? 2.2 : 1.6} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-16 h-8 items-center justify-center rounded-full ${focused ? 'bg-[#064e3b]' : ''}`}>
              <Target size={22} color={focused ? '#34d399' : color} strokeWidth={focused ? 2.2 : 1.6} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-16 h-8 items-center justify-center rounded-full ${focused ? 'bg-[#064e3b]' : ''}`}>
              <Zap size={22} color={focused ? '#34d399' : color} strokeWidth={focused ? 2.2 : 1.6} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-16 h-8 items-center justify-center rounded-full ${focused ? 'bg-[#064e3b]' : ''}`}>
              <MessageCircle size={22} color={focused ? '#34d399' : color} strokeWidth={focused ? 2.2 : 1.6} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View className={`w-16 h-8 items-center justify-center rounded-full ${focused ? 'bg-[#064e3b]' : ''}`}>
              <User size={22} color={focused ? '#34d399' : color} strokeWidth={focused ? 2.2 : 1.6} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
