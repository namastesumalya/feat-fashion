import { Order } from '../types';

/**
 * Convert number to Indian currency words
 */
function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  };

  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';
  return (inWords(rounded).trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

/**
 * Generate standalone printable HTML Tax Invoice for Feather Hut Fashion
 */
export function generateTaxInvoiceHTML(order: Order): string {
  // Clear, deterministic Invoice Number preserving full Order SKU Reference
  const cleanId = order.id.toUpperCase();
  const invoiceNo = cleanId.startsWith('INV-') ? cleanId : `INV-FEAT-${cleanId}`;
  const invoiceDate = order.date ? order.date.split(' ')[0] : new Date().toISOString().split('T')[0];
  const state = order.deliveryAddress?.state || 'West Bengal';
  const isIntraState = state.toLowerCase().includes('bengal') || state.toLowerCase().includes('wb');
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const logoUrl = origin ? `${origin}/logo.png` : '/logo.png';
  
  // Tax calculations (5% GST for garments/ethnic apparel under HSN 6204/5208)
  const gstRate = 0.05;

  // Defensive calculations for Total MRP and Catalogue Discount
  const totalMrp = (order.totalMrp && order.totalMrp > 0)
    ? order.totalMrp
    : order.items.reduce((s, i) => s + (Number(i.product.originalPrice) || Number(i.product.price) || 0) * i.quantity, 0);

  const totalSellingPrice = order.items.reduce((s, i) => s + (Number(i.product.price) || 0) * i.quantity, 0);
  const calculatedDiscount = Math.max(0, totalMrp - totalSellingPrice);
  const catalogueDiscount = (order.discountAmount && order.discountAmount > 0) ? order.discountAmount : calculatedDiscount;
  const couponDiscount = order.couponDiscount || 0;
  const deliveryCharge = order.deliveryCharge || 0;
  const finalAmount = order.finalAmount > 0 ? order.finalAmount : Math.max(0, totalSellingPrice - couponDiscount + deliveryCharge);

  // Inclusive GST math: Selling Price includes 5% GST
  // Taxable Value (Excluding GST) = Total / 1.05
  // GST Amount (5%) = Total - Taxable Value
  const productPayable = Math.max(0, finalAmount - deliveryCharge);
  const taxableAmount = productPayable / (1 + gstRate);
  const totalTax = productPayable - taxableAmount;
  const cgst = isIntraState ? (totalTax / 2) : 0;
  const sgst = isIntraState ? (totalTax / 2) : 0;
  const igst = !isIntraState ? totalTax : 0;

  const itemsHtml = order.items.map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.product.price) || 0;
    const unitMrp = Number(item.product.originalPrice) || unitPrice;
    const itemTotal = unitPrice * qty;
    
    // Inclusive GST breakdown per item
    const itemTaxable = itemTotal / (1 + gstRate);
    const itemTax = itemTotal - itemTaxable;
    const unitTaxable = unitPrice / (1 + gstRate);
    const unitTax = unitPrice - unitTaxable;
    const itemDiscount = Math.max(0, (unitMrp - unitPrice) * qty);

    const sku = item.product.sku || (item.product as any).skucode || item.product.id;
    const hsn = '6204'; // HSN for women's ethnic suits, kurtis & sarees

    return `
      <tr>
        <td style="text-align: center; padding: 8px 6px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 8px 10px; border: 1px solid #e5e7eb;">
          <div style="font-weight: 700; color: #111827;">${item.product.name}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
            SKU: <strong style="color: #831843;">${sku}</strong> | Size: <strong>${item.selectedSize || 'Free Size'}</strong>
            ${item.selectedColor ? `| Color: <strong>${item.selectedColor}</strong>` : ''}
          </div>
        </td>
        <td style="text-align: center; padding: 8px 6px; border: 1px solid #e5e7eb; font-family: monospace;">${hsn}</td>
        <td style="text-align: center; padding: 8px 6px; border: 1px solid #e5e7eb; font-weight: 600;">${qty}</td>
        <td style="text-align: right; padding: 8px 8px; border: 1px solid #e5e7eb; color: #6b7280;">₹${(unitMrp * qty).toLocaleString('en-IN')}</td>
        <td style="text-align: right; padding: 8px 8px; border: 1px solid #e5e7eb; color: #059669;">${itemDiscount > 0 ? `-₹${itemDiscount.toLocaleString('en-IN')}` : '₹0'}</td>
        <td style="text-align: right; padding: 8px 8px; border: 1px solid #e5e7eb;">₹${itemTaxable.toFixed(2)}</td>
        <td style="text-align: right; padding: 8px 8px; border: 1px solid #e5e7eb;">₹${itemTax.toFixed(2)}</td>
        <td style="text-align: right; padding: 8px 10px; border: 1px solid #e5e7eb; font-weight: 700; color: #831843;">₹${itemTotal.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${origin ? `<base href="${origin}/">` : ''}
  <title>Tax Invoice - ${order.id} | Feather Hut Fashion</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.4;
      padding: 16px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .header-table td { vertical-align: top; }
    .brand-title { font-size: 22px; font-weight: 900; color: #831843; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 11px; color: #9d174d; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .badge-tax { display: inline-block; background: #fdf2f8; color: #831843; border: 1px solid #fbcfe8; padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 12px; text-transform: uppercase; }
    .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 11px; }
    .meta-grid { display: table; width: 100%; }
    .meta-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
    .table-items { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 16px; font-size: 11px; }
    .table-items th { background: #fdf2f8; color: #831843; font-weight: 800; text-align: left; padding: 8px 10px; border: 1px solid #fbcfe8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    .summary-table td { padding: 4px 8px; }
    .total-row { background: #fdf2f8; font-size: 13px; font-weight: 900; color: #831843; border-top: 2px solid #831843; border-bottom: 2px solid #831843; }
    .footer-note { font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 20px; }
    .stamp-box { border: 1px dashed #f472b6; background: #fff5f7; border-radius: 6px; padding: 10px; text-align: center; display: inline-block; min-width: 180px; }
    .print-bar { background: #831843; color: white; padding: 12px 20px; text-align: center; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #fde047; color: #831843; font-weight: 800; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .print-btn:hover { background: #facc15; }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; background: none; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="print-bar">
    <div style="font-size: 13px;">
      <strong>Feather Hut Fashion GST Tax Invoice</strong> &bull; Order #${order.id}
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <button class="print-btn" style="background: #ffffff; color: #831843; border: 1px solid #fbcfe8;" onclick="downloadInvoiceHTML()">⬇️ Download HTML</button>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
  </div>

  <div class="invoice-card">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <table style="border-collapse: collapse; margin-bottom: 6px;">
            <tr>
              <td style="vertical-align: middle; padding-right: 12px; width: 50px;">
                <img src="${logoUrl}" alt="Feat Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #fbcfe8; background: #ffffff; padding: 2px; display: block;" onerror="this.style.display='none'" />
              </td>
              <td style="vertical-align: middle;">
                <div class="brand-title">Feat: Wear Feat, Wear Confidence</div>
                <div class="brand-subtitle">Authentic Handloom &amp; Designer Ethnic Studio</div>
              </td>
            </tr>
          </table>
          <div style="font-size: 11px; color: #4b5563; margin-top: 6px;">
            <strong>GSTIN:</strong> 19APAPC3078H1Z1<br>
            <strong>Registered Office:</strong> Khanyan, Hooghly, West Bengal - 712147, India<br>
            <strong>Customer Support:</strong> +91 7869579735 | support@featherhutfashion.com
          </div>
        </td>
        <td style="width: 40%; text-align: right;">
          <div class="badge-tax">Original Tax Invoice</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 8px; line-height: 1.6;">
            <strong>Invoice No:</strong> <span style="font-family: monospace; color: #831843;">${invoiceNo}</span><br>
            <strong>Invoice Date:</strong> ${invoiceDate}<br>
            <strong>Order ID:</strong> <span style="font-family: monospace; font-weight: 700;">#${order.id}</span><br>
            <strong>Place of Supply:</strong> ${state} (State Code: ${isIntraState ? '19' : 'Other'})
          </div>
        </td>
      </tr>
    </table>

    <!-- Customer & Shipping Details Grid -->
    <div class="meta-box">
      <div class="meta-grid">
        <div class="meta-col" style="border-right: 1px solid #e5e7eb;">
          <div style="font-weight: 800; color: #831843; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">
            👤 Billed &amp; Delivered To
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #111827;">${order.deliveryAddress?.fullName || 'Customer'}</div>
          <div style="color: #4b5563; margin-top: 2px;">
            ${order.deliveryAddress?.addressLine || 'Address'}<br>
            ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}<br>
            <strong>Contact:</strong> ${order.deliveryAddress?.phone || 'N/A'}<br>
            <strong>Email:</strong> ${order.customerEmail || 'customer@feat.in'}
          </div>
        </div>

        <div class="meta-col" style="padding-left: 16px;">
          <div style="font-weight: 800; color: #831843; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">
            🚚 Logistics &amp; Payment Details
          </div>
          <div style="color: #4b5563; line-height: 1.6;">
            <strong>Payment Mode:</strong> <span style="color: #065f46; font-weight: 700;">${order.paymentMethod}</span> (${order.paymentStatus})<br>
            ${order.phonepeTransactionId || order.transactionId ? `<strong>Txn / UTR ID:</strong> <span style="font-family: monospace; font-size: 10px;">${order.phonepeTransactionId || order.transactionId}</span><br>` : ''}
            <strong>Courier Partner:</strong> ${order.shiprocketCourierName || 'Shiprocket (BlueDart / Delhivery)'}<br>
            <strong>AWB Tracking No:</strong> <span style="font-family: monospace; font-weight: 700; color: #831843;">${order.shiprocketAwbCode || `SR-FEAT-${order.id.slice(-6)}`}</span><br>
            <strong>Dispatch Node:</strong> Feat Central Warehouse, Khanyan, Hooghly, West Bengal - 712147
          </div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="table-items">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          <th style="width: 32%;">Item Description &amp; SKU</th>
          <th style="width: 7%; text-align: center;">HSN</th>
          <th style="width: 5%; text-align: center;">Qty</th>
          <th style="width: 10%; text-align: right;">MRP Total</th>
          <th style="width: 10%; text-align: right;">Discount</th>
          <th style="width: 11%; text-align: right;">Taxable (Excl. GST)</th>
          <th style="width: 9%; text-align: right;">GST (5%)</th>
          <th style="width: 12%; text-align: right;">Final Price (Incl. GST)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals and Breakdown -->
    <div style="display: table; width: 100%; margin-top: 8px;">
      <div style="display: table-cell; width: 55%; vertical-align: top; padding-right: 16px;">
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-size: 11px;">
          <strong style="color: #374151;">Amount in Words:</strong>
          <div style="font-weight: 700; color: #831843; margin-top: 2px;">
            ${numberToWords(finalAmount)}
          </div>
        </div>

        <div style="margin-top: 14px;">
          <div style="font-size: 10px; color: #6b7280; margin-bottom: 6px;">
            <strong>Statutory GST Breakdown (5% Rate Included in Selling Price):</strong>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e5e7eb;">
            <tr style="background: #fdf2f8; font-weight: 700;">
              <td style="padding: 4px 6px; border: 1px solid #e5e7eb;">Tax Type</td>
              <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">Rate</td>
              <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">Taxable Base</td>
              <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">Tax Amount</td>
            </tr>
            ${isIntraState ? `
              <tr>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb;">CGST (Central GST)</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">2.5%</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${(taxableAmount / 2).toFixed(2)}</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${cgst.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb;">SGST (State GST)</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">2.5%</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${(taxableAmount / 2).toFixed(2)}</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${sgst.toFixed(2)}</td>
              </tr>
            ` : `
              <tr>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb;">IGST (Integrated GST)</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">5.0%</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${taxableAmount.toFixed(2)}</td>
                <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right;">₹${igst.toFixed(2)}</td>
              </tr>
            `}
            <tr style="background: #f9fafb; font-weight: 700;">
              <td colspan="3" style="padding: 4px 6px; border: 1px solid #e5e7eb;">Total GST Component (Included in Price)</td>
              <td style="padding: 4px 6px; border: 1px solid #e5e7eb; text-align: right; color: #831843;">₹${totalTax.toFixed(2)}</td>
            </tr>
          </table>
          <div style="font-size: 9.5px; color: #4b5563; margin-top: 4px; line-height: 1.3;">
            * <em>Note: Catalog prices on the website are all-inclusive of GST. Taxable Value (₹${taxableAmount.toFixed(2)}) + GST (₹${totalTax.toFixed(2)}) = Net Product Price (₹${productPayable.toFixed(2)}).</em>
          </div>
        </div>
      </div>

      <div style="display: table-cell; width: 45%; vertical-align: top;">
        <table class="summary-table">
          <tr>
            <td style="color: #6b7280;">Total MRP:</td>
            <td style="text-align: right; font-weight: 600;">₹${totalMrp.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="color: #6b7280;">Catalogue Discount:</td>
            <td style="text-align: right; color: #059669; font-weight: 600;">-₹${catalogueDiscount.toLocaleString('en-IN')}</td>
          </tr>
          ${couponDiscount > 0 ? `
            <tr>
              <td style="color: #6b7280;">Coupon Discount (${order.promoCodeUsed || 'PROMO'}):</td>
              <td style="text-align: right; color: #059669; font-weight: 600;">-₹${couponDiscount.toLocaleString('en-IN')}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="color: #6b7280;">Net Taxable Base (Excl. GST):</td>
            <td style="text-align: right; font-weight: 600;">₹${taxableAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #6b7280;">Total Tax (5% GST Included):</td>
            <td style="text-align: right; font-weight: 600; color: #831843;">₹${totalTax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #6b7280;">Shipping &amp; Express Handling:</td>
            <td style="text-align: right; font-weight: 600;">
              ${deliveryCharge === 0 ? '<span style="color: #059669;">FREE</span>' : `₹${deliveryCharge}`}
            </td>
          </tr>
          <tr class="total-row">
            <td style="padding: 8px 8px;">Net Payable Amount (All-Inclusive):</td>
            <td style="text-align: right; padding: 8px 8px;">₹${finalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <div style="text-align: right; margin-top: 20px;">
          <div class="stamp-box">
            <div style="font-weight: 800; color: #831843; font-size: 11px;">FEATHER HUT FASHION</div>
            <div style="font-size: 9px; color: #059669; font-weight: 700; margin: 2px 0;">✓ DIGITALLY VERIFIED INVOICE</div>
            <div style="font-size: 9px; color: #6b7280;">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Terms & Declarations -->
    <div class="footer-note">
      <p><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
      <p style="margin-top: 4px;">• 2-Day Return &amp; Exchange Policy valid from the date of delivery. Handloom dry-clean recommended for Silk &amp; Zari apparel.</p>
      <p style="margin-top: 2px;">• This is a computer generated invoice and requires no physical signature under the Information Technology Act, 2000.</p>
    </div>
  </div>

  <script>
    function downloadInvoiceHTML() {
      try {
        var clone = document.documentElement.cloneNode(true);
        var pBar = clone.querySelector('.print-bar');
        if (pBar) pBar.remove();
        var blob = new Blob(['<!DOCTYPE html>\\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Tax-Invoice-${order.id}.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      } catch (err) {
        window.print();
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Direct file download of the Tax Invoice HTML document
 */
export function downloadTaxInvoiceFile(order: Order): void {
  try {
    const htmlContent = generateTaxInvoiceHTML(order);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tax-Invoice-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Failed to trigger direct invoice download:', error);
    downloadTaxInvoice(order);
  }
}

/**
 * Trigger clean browser Print / Save as PDF dialog for this invoice
 */
export function printTaxInvoice(order: Order): void {
  try {
    const htmlContent = generateTaxInvoiceHTML(order);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to window.open', e);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error printing tax invoice:', error);
    downloadTaxInvoiceFile(order);
  }
}

/**
 * Trigger invoice download / print view in new window or instant download
 */
export function downloadTaxInvoice(order: Order): void {
  try {
    const htmlContent = generateTaxInvoiceHTML(order);
    
    // Open printable pop-up window
    const printWindow = window.open('', '_blank', 'width=860,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      return;
    }

    // Fallback: Trigger direct HTML blob download if popup was blocked
    downloadTaxInvoiceFile(order);
  } catch (error) {
    console.error('Error generating tax invoice download:', error);
    downloadTaxInvoiceFile(order);
  }
}
