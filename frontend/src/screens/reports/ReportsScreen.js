import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { Text, Card, FAB, Snackbar, Button, Modal, Portal, TextInput, Chip, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { reportsAPI } from '../../services/api';
import { COLORS, REPORT_TYPES } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

const ReportsScreen = () => {
  const { isAdmin, token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [message, setMessage] = useState('');
  
  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ reportTitle: '', reportType: '', visibility: 'ADMIN' });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Rename Modal State
  const [renameVisible, setRenameVisible] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const fetchReports = async () => {
    try {
      const res = await reportsAPI.getAll();
      setReports(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchReports(); }, []));

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

  const handleGenerate = async () => {
    if (!form.reportTitle || !form.reportType) return setMessage('Title and type are required');
    setSubmitLoading(true);
    try {
      await reportsAPI.generate(form);
      setModalVisible(false);
      setForm({ reportTitle: '', reportType: '', visibility: 'ADMIN' });
      setMessage('Report generated successfully');
      fetchReports();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to generate report');
    } finally { setSubmitLoading(false); }
  };

  const handleRename = async () => {
    if (!newTitle.trim()) return;
    try {
      await reportsAPI.update(editReport._id, { reportTitle: newTitle });
      setRenameVisible(false);
      setMessage('Report renamed');
      fetchReports();
    } catch (err) {
      setMessage('Rename failed');
    }
  };

  const handleDownload = async (report) => {
    const url = reportsAPI.getDownloadUrl(report._id);
    try {
      setMessage('Opening PDF...');
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setMessage('Cannot open download link');
      }
    } catch (err) {
      console.error(err);
      setMessage('Download error');
    }
  };

  const renderReport = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.reportTitle}</Text>
            <Text style={styles.type}>{REPORT_TYPES.find(r => r.value === item.reportType)?.label || item.reportType}</Text>
          </View>
          {isAdmin() && (
            <IconButton icon="pencil-outline" size={20} onPress={() => {
              setEditReport(item);
              setNewTitle(item.reportTitle);
              setRenameVisible(true);
            }} />
          )}
        </View>
        
        <Text style={styles.detail}>Created: {new Date(item.createdAt).toLocaleDateString()} • {item.createdBy}</Text>
        
        <View style={styles.actions}>
          <Button mode="outlined" icon="download" onPress={() => handleDownload(item)} style={styles.actionBtn}>
            Download
          </Button>
          {isAdmin() && (
            <>
              <Button mode="outlined" icon="pencil" onPress={() => {
                setEditReport(item);
                setNewTitle(item.reportTitle);
                setRenameVisible(true);
              }} style={[styles.actionBtn, { borderColor: COLORS.primary }]}>
                Edit
              </Button>
              <Button mode="text" textColor={COLORS.error} onPress={() => setDeleteId(item._id)}>
                Delete
              </Button>
            </>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList 
        data={reports} 
        keyExtractor={item => item._id} 
        renderItem={renderReport}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<EmptyState message="No reports found" icon="file-document-outline" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} colors={[COLORS.primary]} />}
      />

      {isAdmin() && (
        <FAB icon="plus" label="Generate Report" style={styles.fab} onPress={() => setModalVisible(true)} color={COLORS.white} />
      )}

      {/* Generate Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Generate New Report</Text>
          <TextInput label="Report Title" value={form.reportTitle} onChangeText={v => setForm({ ...form, reportTitle: v })}
            mode="outlined" style={styles.input} />
          
          <Text style={styles.inputLabel}>Select Type</Text>
          <View style={styles.chipGrid}>
            {REPORT_TYPES.map(rt => (
              <Chip key={rt.value} selected={form.reportType === rt.value} onPress={() => setForm({ ...form, reportType: rt.value })}
                style={[styles.typeChip, form.reportType === rt.value && { backgroundColor: COLORS.primary }]}
                textStyle={form.reportType === rt.value && { color: COLORS.white }}>
                {rt.label}
              </Chip>
            ))}
          </View>

          <Button mode="contained" onPress={handleGenerate} loading={submitLoading} disabled={submitLoading}
            buttonColor={COLORS.primary} style={styles.submitBtn}>
            Generate PDF
          </Button>
        </Modal>

        {/* Rename Modal */}
        <Modal visible={renameVisible} onDismiss={() => setRenameVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Rename Report</Text>
          <TextInput label="New Title" value={newTitle} onChangeText={setNewTitle}
            mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handleRename} buttonColor={COLORS.primary} style={styles.submitBtn}>
            Update Name
          </Button>
        </Modal>
      </Portal>

      <ConfirmDialog visible={!!deleteId} title="Delete Report" message="Permanently delete this report?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  type: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  detail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  actionBtn: { borderRadius: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary, borderRadius: 28 },
  modal: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeChip: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
  submitBtn: { borderRadius: 8, paddingVertical: 4 },
});

export default ReportsScreen;
