import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import type { InvoiceRow, InvoiceItemRow, ClientRow, PhotographerRow } from '@/types/database'
import { formatDate } from '@/lib/utils'

// Helvetica doesn't support ₦ or other special currency symbols — use code + number
function pdfCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface InvoicePdfProps {
  invoice: InvoiceRow
  photographer: PhotographerRow
  items: InvoiceItemRow[]
  client: ClientRow | null
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    padding: 48,
    backgroundColor: '#ffffff',
  },
  accentBar: {
    height: 4,
    marginBottom: 32,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  invoiceLabel: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
  },
  label: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    color: '#222',
    fontFamily: 'Helvetica-Bold',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 28,
  },
  addressBlock: {
    flex: 1,
  },
  addressName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 3,
  },
  addressText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  titleText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: '6 8',
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '7 8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colRate: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  tableHeaderText: {
    fontSize: 8,
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellText: {
    fontSize: 9,
    color: '#444',
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginTop: 16,
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    marginBottom: 4,
  },
  totalsLabel: { fontSize: 9, color: '#777' },
  totalsValue: { fontSize: 9, color: '#222' },
  totalBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    borderTopWidth: 1,
    paddingTop: 5,
    marginTop: 4,
  },
  totalBoldLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  totalBoldValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    marginTop: 4,
  },
  paymentBox: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: '#aaa',
  },
  poweredBy: {
    fontSize: 7,
    color: '#ccc',
    marginTop: 3,
  },
})

export function InvoicePdfDocument({ invoice, photographer, items, client }: InvoicePdfProps) {
  const brandColor = photographer.brand_color ?? '#6366f1'
  const currency = invoice.currency

  const discountAmount = invoice.discount_type === 'percentage'
    ? (invoice.subtotal * invoice.discount_value) / 100
    : invoice.discount_type === 'fixed' ? invoice.discount_value : 0

  const sortedItems = [...items].sort((a, b) => a.display_order - b.display_order)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top accent */}
        <View style={[styles.accentBar, { backgroundColor: brandColor }]} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>
              {photographer.business_name ?? photographer.full_name}
            </Text>
            <Text style={{ fontSize: 9, color: '#888', marginTop: 3 }}>{photographer.email}</Text>
            {photographer.phone && (
              <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{photographer.phone}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.invoiceLabel, { color: brandColor }]}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={styles.value}>{formatDate(invoice.issue_date)}</Text>
          </View>
          {invoice.due_date && (
            <View>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, { textTransform: 'capitalize' }]}>{invoice.status}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.addressName}>
              {photographer.business_name ?? photographer.full_name}
            </Text>
            {photographer.bank_name && (
              <Text style={styles.addressText}>
                {photographer.bank_name}{'\n'}
                {photographer.account_number}{'\n'}
                {photographer.account_name}
              </Text>
            )}
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.addressName}>{client?.name ?? 'Client'}</Text>
            {client?.email && <Text style={styles.addressText}>{client.email}</Text>}
            {client?.address && <Text style={styles.addressText}>{client.address}</Text>}
            {client?.phone && <Text style={styles.addressText}>{client.phone}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.titleText}>{invoice.title}</Text>

        {/* Table header */}
        <View style={[styles.tableHeader, { backgroundColor: brandColor }]}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Amount</Text>
        </View>

        {/* Table rows */}
        {sortedItems.map((item, i) => (
          <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.tableCellText, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.tableCellText, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.tableCellText, styles.colRate]}>
              {pdfCurrency(item.unit_price, currency)}
            </Text>
            <Text style={[styles.tableCellBold, styles.colTotal]}>
              {pdfCurrency(item.total, currency)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{pdfCurrency(invoice.subtotal, currency)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-{pdfCurrency(discountAmount, currency)}</Text>
            </View>
          )}
          {invoice.tax_amount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({invoice.tax_rate}%)</Text>
              <Text style={styles.totalsValue}>+{pdfCurrency(invoice.tax_amount, currency)}</Text>
            </View>
          )}
          <View style={[styles.totalBold, { borderTopColor: brandColor }]}>
            <Text style={[styles.totalBoldLabel, { color: brandColor }]}>Total</Text>
            <Text style={[styles.totalBoldValue, { color: brandColor }]}>
              {pdfCurrency(invoice.total, currency)}
            </Text>
          </View>
          {invoice.amount_paid > 0 && (
            <View style={[styles.totalsRow, { marginTop: 6 }]}>
              <Text style={styles.totalsLabel}>Amount Paid</Text>
              <Text style={styles.totalsValue}>-{pdfCurrency(invoice.amount_paid, currency)}</Text>
            </View>
          )}
          {invoice.balance_due > 0 && (
            <View style={styles.balanceDue}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#d97706' }}>Balance Due</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#d97706' }}>
                {pdfCurrency(invoice.balance_due, currency)}
              </Text>
            </View>
          )}
        </View>

        {/* Payment instructions */}
        {photographer.bank_name && (
          <View style={styles.paymentBox}>
            <Text style={styles.sectionTitle}>Payment Instructions</Text>
            <Text style={styles.sectionText}>
              Bank: {photographer.bank_name}{'\n'}
              Account Number: {photographer.account_number}{'\n'}
              Account Name: {photographer.account_name}
            </Text>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.sectionText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {invoice.terms && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.sectionText}>{invoice.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {invoice.footer_message ?? 'Thank you for your business!'}
          </Text>
          <Text style={styles.poweredBy}>Generated by PixVault</Text>
        </View>
      </Page>
    </Document>
  )
}
