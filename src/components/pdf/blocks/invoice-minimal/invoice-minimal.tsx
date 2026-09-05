import { KeyValue } from "@/components/pdf/key-value/key-value";
import { PageFooter } from "@/components/pdf/page-footer/page-footer";
import { PageHeader } from "@/components/pdf/page-header/page-header";
import { Section } from "@/components/pdf/section/section";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/pdf/table/table";
import { Text } from "@/components/pdf/text/text";
import {
  PdfcnThemeProvider,
  usePdfcnTheme,
} from "@/components/pdf/theme-provider";
import {
  View,
  StyleSheet,
  Document,
  Page,
} from "@/lib/pdf-primitives";
import type { PdfcnTheme } from "@/components/pdf-themes";

import type { InvoiceMinimalData } from "./invoice-minimal.types";

// Sample data — replace with your own props or data source
/** Amounts were hardcoded to "$" — this renders whatever currency the invoice is actually in. */
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: 2 }).format(amount);

const sampleData: InvoiceMinimalData = {
  currency: "USD",
  billTo: {
    address: "500 Enterprise Way, Building A",
    email: "finance@enterprisecorp.io",
    name: "Enterprise Corp",
    phone: "+1 (555) 246-8135",
  },
  companyAddress: "Nagpur, IN",
  companyEmail: "hello@pdfcn.app",
  companyName: "pdfcn",
  dueDate: "March 22, 2026",
  invoiceDate: "February 20, 2026",
  invoiceNumber: "INV-2026-003",
  items: [
    { description: "Annual License Plan", quantity: 1, unitPrice: 25_000 },
    { description: "Support & Maintenance", quantity: 12, unitPrice: 1500 },
    { description: "Custom Integration", quantity: 1, unitPrice: 12_000 },
  ],
  notes:
    "Invoice for annual enterprise subscription. Please retain for your records.",
  paymentTerms: {
    dueDate: "March 22, 2026",
    gst: "GSTIN 123456789",
    method: "ACH Transfer / Check",
  },
  subtitle: "Innovative PDF Solutions",
  summary: {
    subtotal: 55_000,
    tax: 3850,
    total: 58_850,
  },
};

const InvoiceMinimalContent = ({ data }: { data: InvoiceMinimalData }) => {
  const theme = usePdfcnTheme();

  const styles = StyleSheet.create({
    infoLabel: {
      color: theme.colors.primary,
      fontSize: 8,
      fontWeight: "bold",
      letterSpacing: 0.8,
      marginBottom: 4,
      textTransform: "uppercase",
    },
    infoRow: {
      flexDirection: "row",
      marginBottom: theme.spacing.sectionGap,
    },
    invoiceStamp: {
      alignSelf: "flex-start",
      borderColor: theme.colors.primary,
      borderRadius: theme.primitives.borderRadius.sm,
      borderStyle: "solid",
      borderWidth: 2,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    page: {
      backgroundColor: theme.colors.background,
      boxSizing: "border-box",
      // Was a hardcoded 841 (full A4 height) on top of the page padding, which overflowed by a
      // few points and pushed the footer onto a second, near-empty page.
      minHeight: "100%",
      padding: theme.spacing.page.marginTop,
      paddingBottom: theme.spacing.page.marginBottom,
      position: "relative",
    },
  });

  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <Section
          noWrap
          style={{
            alignItems: "flex-start",
            flexDirection: "row",
            marginBottom: theme.spacing.sectionGap,
          }}
        >
          <View style={{ flex: 1 }}>
            <PageHeader
              variant="minimal"
              title={data.companyName}
              subtitle={[data.companyAddress, data.companyEmail].filter(Boolean).join("  ·  ") || undefined}
              marginBottom={0}
            />
          </View>
          <View style={styles.invoiceStamp}>
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 7,
                fontWeight: "bold",
                textAlign: "right",
              }}
              noMargin
              transform="uppercase"
            >
              Invoice
            </Text>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 14,
                fontWeight: "bold",
                textAlign: "right",
              }}
              noMargin
            >
              {data.invoiceNumber}
            </Text>
            <Text
              style={{
                color: theme.colors.mutedForeground,
                fontSize: 8,
                textAlign: "right",
              }}
              noMargin
            >
              {data.invoiceDate}
            </Text>
          </View>
        </Section>
        <View style={styles.infoRow}>
          <View style={{ paddingRight: 20, width: "50%" }}>
            <Text style={styles.infoLabel} noMargin>
              Bill To
            </Text>
            <Text variant="sm" noMargin>
              {data.billTo.name}
            </Text>
            <Text variant="xs" noMargin color="mutedForeground">
              {data.billTo.address}
            </Text>
            <Text variant="xs" noMargin color="mutedForeground">
              {data.billTo.email}
            </Text>
            <Text variant="xs" noMargin color="mutedForeground">
              {data.billTo.phone}
            </Text>
          </View>
          <View style={{ width: "50%" }}>
            <Text style={styles.infoLabel} noMargin>
              Invoice Details
            </Text>
            <KeyValue
              size="sm"
              items={[
                { key: "Date", value: data.invoiceDate },
                { key: "Payment", value: data.paymentTerms.method },
                { key: "GST", value: data.paymentTerms.gst },
              ].filter((item) => Boolean(item.value))}
            />
          </View>
        </View>
        <Table variant="compact">
          <TableHeader>
            <TableRow header>
              <TableCell>Description</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: invoice items have no stable id
              <TableRow key={index}>
                <TableCell>{item.description}</TableCell>
                <TableCell align="center">{`${item.quantity}`}</TableCell>
                <TableCell align="right">{money(item.unitPrice, data.currency)}</TableCell>
                <TableCell align="right">{money(item.quantity * item.unitPrice, data.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Section noWrap style={{ flexDirection: "row", marginTop: 20 }}>
          <View style={{ flex: 1 }} />
          <View style={{ width: 240 }}>
            <KeyValue
              size="sm"
              dividerThickness={1}
              items={[
                { key: "Subtotal", value: money(data.summary.subtotal, data.currency) },
                // The rate was hardcoded to 7%; a zero-tax invoice shouldn't show the row at all.
                ...(data.summary.tax > 0 ? [{ key: "Tax", value: money(data.summary.tax, data.currency) }] : []),
                {
                  key: "Total",
                  keyStyle: { fontSize: 12, fontWeight: "bold" },
                  value: money(data.summary.total, data.currency),
                  valueStyle: {
                    color: theme.colors.primary,
                    fontSize: 13,
                    fontWeight: "bold",
                  },
                },
              ]}
              divided
            />
          </View>
        </Section>
        <PageFooter
          leftText={data.notes}
          rightText="Page 1 of 1"
          sticky
          pagePadding={25}
        />
      </Page>
    </Document>
  );
};

export const InvoiceMinimalDocument = ({
  theme,
  data = sampleData,
}: {
  theme?: PdfcnTheme;
  data?: InvoiceMinimalData;
}) => (
  <PdfcnThemeProvider theme={theme}>
    <InvoiceMinimalContent data={data} />
  </PdfcnThemeProvider>
);
