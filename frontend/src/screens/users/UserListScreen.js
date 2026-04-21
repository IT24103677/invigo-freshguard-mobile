import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar, Chip, Avatar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI } from '../../services/api';
import { COLORS } from '../../constants/config';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const UserListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll({ search: search || undefined });
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchUsers(); }, [search]));

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deleteId);
      setMessage('User deleted');
      setDeleteId(null);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed');
      setDeleteId(null);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('UserDetails', { user: item })}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text size={50} label={item.name?.charAt(0)?.toUpperCase() || 'U'} style={{ backgroundColor: COLORS.primaryLight }} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
            <View style={styles.chipRow}>
              <Chip style={{ backgroundColor: COLORS.secondary + '20', marginRight: 8 }} textStyle={{ fontSize: 10, color: COLORS.secondary, marginVertical: 0 }}>
                {item.role}
              </Chip>
              <Chip style={{ backgroundColor: (item.status === 'ACTIVE' ? COLORS.safe : COLORS.error) + '20' }}
                textStyle={{ fontSize: 10, color: item.status === 'ACTIVE' ? COLORS.safe : COLORS.error, marginVertical: 0 }}>
                {item.status}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search users by name, username..." />
      <FlatList data={users} keyExtractor={item => item._id} renderItem={renderUser}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No users found" icon="account-search-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} colors={[COLORS.primary]} />}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('AddUser')} color={COLORS.white} />
      <ConfirmDialog visible={!!deleteId} title="Delete User" message="Are you sure you want to delete this user?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  info: { marginLeft: 16, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  username: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
});

export default UserListScreen;
