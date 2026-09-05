export interface InvoiceMinimalData {
  /** ISO code the amounts are in. The block was hardcoded to "$". */
  currency: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyName: string;
  subtitle: string;
  companyAddress: string;
  companyEmail: string;
  billTo: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  summary: {
    subtotal: number;
    tax: number;
    total: number;
  };
  paymentTerms: {
    dueDate: string;
    method: string;
    gst: string;
  };
  notes?: string;
}
