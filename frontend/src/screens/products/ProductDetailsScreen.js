import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Divider, Chip } from 'react-native-paper';
import { COLORS } from '../../constants/config';

const ProductDetailsScreen = ({ route }) => {
  const { product } = route.params;

  const DetailRow = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text style={styles.name}>{product.productName}</Text>
            <Chip style={styles.chip} textStyle={styles.chipText}>{product.mainCategory}</Chip>
          </View>
          <Text style={styles.code}>{product.productCode}</Text>
          <Divider style={styles.divider} />
          <DetailRow label="Sub Category" value={product.subCategory} />
          <DetailRow label="Item Type" value={product.itemType} />
          <DetailRow label="Supplier" value={product.supplier} />
          <Divider style={styles.divider} />
          <DetailRow label="Cost Price" value={`$${product.costPrice?.toFixed(2)}`} />
          <DetailRow label="Selling Price" value={`$${product.sellingPrice?.toFixed(2)}`} />
          <DetailRow label="Profit Margin" value={`$${((product.sellingPrice || 0) - (product.costPrice || 0)).toFixed(2)}`} />
          <Divider style={styles.divider} />
          <DetailRow label="Reorder Level" value={String(product.reorderLevel)} />
          <DetailRow label="Barcode" value={product.barcode} />
          <DetailRow label="Description" value={product.description} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { margin: 16, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text, flex: 1 },
  code: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  chip: { backgroundColor: COLORS.primary + '20' },
  chipText: { fontSize: 11, color: COLORS.primary },
  divider: { marginVertical: 12, backgroundColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});

export default ProductDetailsScreen;
