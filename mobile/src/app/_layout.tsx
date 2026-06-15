import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="task-detail" />
    </Stack>
  );
}
