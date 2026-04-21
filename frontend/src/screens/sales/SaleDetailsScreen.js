import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { COLORS } from '../../constants/config';

const SaleDetailsScreen = ({ route }) => {
  const { sale } = route.params;
  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{sale.product?.productName}</Text>
          <Divider style={styles.divider} />
          <Row label="Batch" value={sale.inventoryBatch?.batchNumber} />
          <Row label="Quantity Sold" value={String(sale.quantity)} />
          <Row label="Sale Date" value={new Date(sale.saleDate).toLocaleDateString()} />
          <Divider style={styles.divider} />
          <Row label="Original Price" value={`$${sale.originalUnitPrice?.toFixed(2)}`} />
          <Row label="Discount" value={`${sale.discountPercent}%`} />
          <Row label="Discounted Price" value={`$${sale.discountedUnitPrice?.toFixed(2)}`} />
          <Row label="Total Amount" value={`$${sale.totalAmount?.toFixed(2)}`} />
          {sale.discountNote && <Row label="Discount Note" value={sale.discountNote} />}
          <Divider style={styles.divider} />
          <Row label="Sold By" value={sale.createdBy} />
          <Row label="Created At" value={sale.createdAt ? new Date(sale.createdAt).toLocaleString() : 'N/A'} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { margin: 16, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  divider: { marginVertical: 12, backgroundColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});

export default SaleDetailsScreen;
