import { Order } from '../types';

export interface ShiprocketLabelResponse {
  success: boolean;
  label_url?: string;
  label_size?: string;
  dimensions?: string;
  shipment_id?: number | string;
  awb_code?: string;
  courier_name?: string;
  error?: string;
  credentialsRequired?: boolean;
  order?: Order;
}

/**
 * 3-Step Automated Shiprocket Shipping Label Service
 * 
 * Step 1 (Create Order): Backend sends order details to Shiprocket (buyer address, weight, dimensions)
 * Step 2 (Assign AWB/Courier): Assigns AWB & courier partner (Blue Dart, Delhivery, Shadowfax)
 * Step 3 (Fetch the Label): POST to /v1/external/courier/generate/label with { shipment_id, label_size: 'thermal' }
 *        Shiprocket creates the formatted 100x150 mm (4x6 inch) thermal label and returns the direct PDF link.
 */
export async function fetchShiprocketThermalLabel(orderId: string): Promise<ShiprocketLabelResponse> {
  try {
    const adminToken = localStorage.getItem('feat_admin_token') || '';
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/generate-shiprocket-label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      }
    });

    const data: ShiprocketLabelResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Shiprocket shipping label service'
    };
  }
}

export interface ShiprocketInvoiceResponse {
  success: boolean;
  invoice_url?: string;
  order_id?: number | string;
  error?: string;
  credentialsRequired?: boolean;
  order?: Order;
}

/**
 * Fetch official Shiprocket Tax Invoice PDF
 */
export async function fetchShiprocketInvoice(orderId: string): Promise<ShiprocketInvoiceResponse> {
  try {
    const adminToken = localStorage.getItem('feat_admin_token') || '';
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/generate-shiprocket-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      }
    });

    const data: ShiprocketInvoiceResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Shiprocket invoice service'
    };
  }
}

/**
 * Automated Route: Opens the Shiprocket PDF link directly in a browser print window.
 * Allows warehouse staff to immediately print the 100x150 mm (4x6") label on their thermal printer
 * with seamless mobile browser popup-blocker bypass and direct fallback.
 */
export function openShiprocketThermalLabelPrint(labelUrl: string) {
  if (!labelUrl) return;

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // For mobile or popup-blocked browsers, trigger direct download/tab opening via a native simulated link
  try {
    const printWindow = window.open(labelUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
      // Direct anchor click fallback for mobile Safari / Android Chrome
      const anchor = document.createElement('a');
      anchor.href = labelUrl;
      anchor.target = isMobile ? '_self' : '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
      }, 300);
    }
  } catch (err) {
    // If window.open throws in mobile sandbox, fallback to location or anchor
    const anchor = document.createElement('a');
    anchor.href = labelUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 300);
  }
}
