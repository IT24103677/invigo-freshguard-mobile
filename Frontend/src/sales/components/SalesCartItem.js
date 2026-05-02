import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SalesProductImage from './SalesProductImage';
import { salesColors, salesTheme } from '../theme';

export default function SalesCartItem({
  item,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemove,
}) {
  const gross = item.quantity * item.unitPrice;
  const discount = gross * (item.discountRate / 100);
  const lineTotal = +(gross - discount).toFixed(2);

  return (
    <View style={styles.container}>
      <SalesProductImage
        imageUrl={item.imageUrl}
        productName={item.productName}
        category={item.category}
        size={48}
        borderRadius={10}
      />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{item.productName}</Text>
          <Pressable onPress={() => onRemove(item.productId)} hitSlop={8}>
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={salesColors.textMuted}
            />
          </Pressable>
        </View>

        <Text style={styles.price}>Rs. {item.unitPrice.toFixed(2)} / unit</Text>

        <View style={styles.controls}>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => onUpdateQuantity(item.productId, -1)}
              style={[styles.stepBtn, item.quantity <= 1 && styles.stepBtnDisabled]}
              disabled={item.quantity <= 1}
            >
              <MaterialCommunityIcons
                name="minus"
                size={14}
                color={item.quantity <= 1 ? salesColors.outline : salesColors.primary}
              />
            </Pressable>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Pressable
              onPress={() => onUpdateQuantity(item.productId, 1)}
              style={styles.stepBtn}
            >
              <MaterialCommunityIcons name="plus" size={14} color={salesColors.primary} />
            </Pressable>
          </View>

          <View style={styles.discountWrap}>
            <MaterialCommunityIcons
              name="tag-outline"
              size={14}
              color={salesColors.secondary}
            />
            <TextInput
              keyboardType="numeric"
              value={item.discountRate > 0 ? String(item.discountRate) : ''}
              onChangeText={(value) => {
                const parsed = parseFloat(value);
                onUpdateDiscount(
                  item.productId,
                  Number.isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed))
                );
              }}
              placeholder="0%"
              placeholderTextColor={salesColors.outline}
              style={styles.discountInput}
            />
          </View>

          <Text style={styles.lineTotal}>Rs. {lineTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: salesColors.surface,
    borderRadius: salesTheme.radii.lg,
    borderWidth: 1,
    borderColor: salesColors.outlineVariant,
    alignItems: 'flex-start',
    ...salesTheme.shadows.card,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: salesColors.text,
    flex: 1,
    marginRight: 6,
  },
  price: {
    fontSize: 12,
    color: salesColors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: salesColors.surfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: salesColors.outlineVariant,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: salesColors.surfaceContainer,
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  qty: {
    width: 30,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: salesColors.text,
  },
  discountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: salesColors.surfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: salesColors.outlineVariant,
    paddingHorizontal: 8,
    height: 28,
    gap: 4,
  },
  discountInput: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: salesColors.secondary,
  },
  lineTotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
    color: salesColors.text,
  },
});
