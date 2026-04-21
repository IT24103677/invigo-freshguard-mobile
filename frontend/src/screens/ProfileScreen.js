import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const InfoRow = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarContainer}>
        <Avatar.Text size={80} label={user?.name?.charAt(0)?.toUpperCase() || 'U'} style={{ backgroundColor: COLORS.primary }} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <InfoRow label="Username" value={user?.username} />
          <Divider style={styles.divider} />
          <InfoRow label="Email" value={user?.email} />
          <Divider style={styles.divider} />
          <InfoRow label="Role" value={user?.role} />
          <Divider style={styles.divider} />
          <InfoRow label="Status" value={user?.status} />
          <Divider style={styles.divider} />
          <InfoRow label="Member Since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'} />
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={logout} style={styles.logoutBtn} buttonColor={COLORS.error}
        contentStyle={{ paddingVertical: 6 }} icon="logout">
        Logout
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  avatarContainer: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.secondary },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 12 },
  role: { fontSize: 13, color: COLORS.primaryLight, marginTop: 4 },
  card: { margin: 16, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  divider: { backgroundColor: COLORS.border },
  logoutBtn: { margin: 16, borderRadius: 12 },
});

export default ProfileScreen;
