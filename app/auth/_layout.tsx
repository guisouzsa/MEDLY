import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9163cb',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#ede8fa' },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="medicamentos"
        options={{
          title: 'Medicamentos',
          tabBarIcon: ({ color }) => (
            <Feather name="activity" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}