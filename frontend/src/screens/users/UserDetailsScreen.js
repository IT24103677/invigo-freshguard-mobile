import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Avatar, Divider, Button, Snackbar } from 'react-native-paper';
import { usersAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import ConfirmDialog from '../../components/ConfirmDialog';

const UserDetailsScreen = ({ route, navigation }) => {
  const { user } = route.params;
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const InfoRow = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  const toggleStatus = async () => {
    setLoading(true);
    try {
      await usersAPI.toggleStatus(user._id);
      navigation.goBack();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to toggle status');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(user._id);
      setDeleteId(null);
      navigation.goBack();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed');
      setDeleteId(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarContainer}>
        <Avatar.Text size={80} label={user.name?.charAt(0)?.toUpperCase()} style={{ backgroundColor: COLORS.primaryLight }} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <InfoRow label="Email" value={user.email} />
          <Divider style={styles.divider} />
          <InfoRow label="Role" value={user.role} />
          <Divider style={styles.divider} />
          <InfoRow label="Status" value={user.status} />
          <Divider style={styles.divider} />
          <InfoRow label="Account Locked" value={user.accountLocked ? 'Yes' : 'No'} />
          <Divider style={styles.divider} />
          <InfoRow label="Failed Logins" value={String(user.failedLoginAttempts || 0)} />
          <Divider style={styles.divider} />
          <InfoRow label="Created At" value={new Date(user.createdAt).toLocaleDateString()} />
        </Card.Content>
      </Card>

      <View style={styles.actionContainer}>
        <Button mode="outlined" onPress={() => navigation.navigate('EditUser', { user })} style={styles.actionBtn}>
          Edit Details
        </Button>
        <Button mode="outlined" onPress={toggleStatus} style={styles.actionBtn} loading={loading} disabled={loading}
          textColor={user.status === 'ACTIVE' ? COLORS.error : COLORS.safe}>
          {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate (Unlock)'}
        </Button>
        <Button mode="contained" buttonColor={COLORS.error} onPress={() => setDeleteId(user._id)} style={styles.actionBtn}>
          Delete User
        </Button>
      </View>

      <ConfirmDialog visible={!!deleteId} title="Delete User" message="Permanently delete this user?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  avatarContainer: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.secondary },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 12 },
  username: { fontSize: 13, color: COLORS.primaryLight, marginTop: 4 },
  card: { margin: 16, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  divider: { backgroundColor: COLORS.border },
  actionContainer: { paddingHorizontal: 16, paddingBottom: 30 },
  actionBtn: { marginBottom: 12, borderRadius: 12 },
});

export default UserDetailsScreen;
