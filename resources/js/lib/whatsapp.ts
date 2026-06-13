import { formatCurrency } from '@/lib/format-currency';
import { getOrderDeliveryMapsUrl } from '@/lib/maps';
import { type Order, type PublicOrganization } from '@/types';

export function normalizeWhatsAppPhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    if (!digits) {
        return null;
    }

    if (digits.length === 10) {
        return `52${digits}`;
    }

    return digits;
}

export function buildWhatsAppContactUrl(phone: string, message?: string): string | null {
    const normalized = normalizeWhatsAppPhone(phone);

    if (!normalized) {
        return null;
    }

    const url = `https://wa.me/${normalized}`;

    if (!message) {
        return url;
    }

    return `${url}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppMessage(order: Order, organization: PublicOrganization): string {
    const lines: string[] = [
        `¡Hola! Quiero confirmar mi pedido en *${organization.name}*:`,
        '',
        `*Cliente:* ${order.customer_name}`,
        `*Teléfono:* ${order.customer_phone}`,
        `*Tipo:* ${order.type === 'pickup' ? 'Recoger en sucursal' : 'A domicilio'}`,
    ];

    if (order.type === 'delivery') {
        lines.push(`*Dirección:* ${order.delivery_address ?? ''}, ${order.delivery_city ?? ''}`);

        const mapsUrl = getOrderDeliveryMapsUrl(order);

        if (mapsUrl) {
            lines.push(`*Ubicación:* ${mapsUrl}`);
        }
    }

    lines.push(`*Pago:* ${order.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}`);

    if (order.customer_notes) {
        lines.push(`*Notas:* ${order.customer_notes}`);
    }

    lines.push('', '*Pedido:*');

    for (const item of order.items) {
        const label = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
        lines.push(`• ${label} x${item.quantity} — ${formatCurrency(item.subtotal)}`);
    }

    lines.push('');
    lines.push(`*Subtotal:* ${formatCurrency(order.subtotal)}`);

    if (Number(order.delivery_fee) > 0) {
        lines.push(`*Envío:* ${formatCurrency(order.delivery_fee)}`);
    }

    lines.push(`*Total:* ${formatCurrency(order.total)}`);

    return lines.join('\n');
}

export function buildWhatsAppUrl(order: Order, organization: PublicOrganization): string | null {
    if (!organization.phone) {
        return null;
    }

    return buildWhatsAppContactUrl(organization.phone, buildWhatsAppMessage(order, organization));
}
