import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
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