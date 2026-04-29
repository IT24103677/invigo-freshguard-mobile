import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_USER_KEY = 'invigo_user';
export const SESSION_TOKEN_KEY = 'invigo_token';

export async function saveSession({ token, user }) {
  if (token) await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
  if (user) await AsyncStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export async function getAuthToken() {
  return (await AsyncStorage.getItem(SESSION_TOKEN_KEY)) || '';
}

export async function getSessionUser() {
  const raw = await AsyncStorage.getItem(SESSION_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([SESSION_USER_KEY, SESSION_TOKEN_KEY]);
}
