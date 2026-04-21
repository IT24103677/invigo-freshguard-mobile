import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Snackbar, Button, Modal, Portal, TextInput, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { reportsAPI } from '../../services/api';
import { COLORS, REPORT_TYPES } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const ReportsScreen = () => {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');
  
  // Custom Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ reportTitle: '', reportType: '', visibility: 'ADMIN' });
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await reportsAPI.getAll({ visibility: filter || undefined });
      setReports(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchReports(); }, [filter]));

  const handleDelete = async () => {
    try {
      await reportsAPI.delete(deleteId);
      setMessage('Report deleted');
      setDeleteId(null);
      fetchReports();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed');
      setDeleteId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.reportTitle || !form.reportType) return setMessage('Title and type are required');
    setSubmitLoading(true);
    try {
      await reportsAPI.create(form);
      setModalVisible(false);
      setForm({ reportTitle: '', reportType: '', visibility: 'ADMIN' });
      setMessage('Report generated successfully');
      fetchReports();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create report');
    } finally { setSubmitLoading(false); }
  };

  const renderReport = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>{item.reportTitle}</Text>
          <Text style={styles.type}>{item.reportType}</Text>
        </View>
        <Text style={styles.detail}>Created by: {item.createdBy} • {new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.detail}>Visibility: {item.visibility}</Text>
        {isAdmin() && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.downloadBtn}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteId(item._id)}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {isAdmin() && (
        <FilterChips
          options={[
            { label: 'All Visibilities', value: null },
            { label: 'Admin Only', value: 'ADMIN' },
            { label: 'Staff & Admin', value: 'ALL' },
          ]}
          selected={filter}
          onSelect={setFilter}
        />
      )}
      <FlatList data={reports} keyExtractor={item => item._id} renderItem={renderReport}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No reports found" icon="file-document-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} colors={[COLORS.primary]} />}
      />

      {isAdmin() && (
        <FAB icon="file-plus-outline" style={styles.fab} onPress={() => setModalVisible(true)} color={COLORS.white} />
      )}

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Generate Report</Text>
          <TextInput label="Report Title" value={form.reportTitle} onChangeText={v => setForm({ ...form, reportTitle: v })}
            mode="outlined" style={styles.input} />
          
          <Text style={styles.inputLabel}>Report Type</Text>
          <View style={styles.chipGrid}>
            {REPORT_TYPES.map(rt => (
              <Chip key={rt.value} selected={form.reportType === rt.value} onPress={() => setForm({ ...form, reportType: rt.value })}
                style={[styles.typeChip, form.reportType === rt.value && { backgroundColor: COLORS.primary }]}
                textStyle={form.reportType === rt.value && { color: COLORS.white }}>
                {rt.label}
              </Chip>
            ))}
          </View>

          <Text style={styles.inputLabel}>Visibility</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Chip selected={form.visibility === 'ADMIN'} onPress={() => setForm({ ...form, visibility: 'ADMIN' })}
              style={[form.visibility === 'ADMIN' && { backgroundColor: COLORS.primary }]}
              textStyle={form.visibility === 'ADMIN' && { color: COLORS.white }}>Admin Only</Chip>
            <Chip selected={form.visibility === 'ALL'} onPress={() => setForm({ ...form, visibility: 'ALL' })}
              style={[form.visibility === 'ALL' && { backgroundColor: COLORS.primary }]}
              textStyle={form.visibility === 'ALL' && { color: COLORS.white }}>All Staff</Chip>
          </View>

          <Button mode="contained" onPress={handleCreate} loading={submitLoading} disabled={submitLoading}
            buttonColor={COLORS.primary} style={{ borderRadius: 8 }}>
            Generate
          </Button>
        </Modal>
      </Portal>

      <ConfirmDialog visible={!!deleteId} title="Delete Report" message="Permantently delete this report history?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  type: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  detail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  downloadBtn: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
  modal: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
});

export default ReportsScreen;
