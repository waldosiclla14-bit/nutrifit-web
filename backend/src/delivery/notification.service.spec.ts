import { DeliveryStatus } from '@prisma/client';
import { NotificationService, DeliveryNotificationData } from './notification.service';

describe('NotificationService · mensajes por tipo de entrega', () => {
  const service = new NotificationService();

  const base: DeliveryNotificationData = {
    deliveryId: 'd1',
    orderNumber: 'NF-000123',
    customerName: 'Ana Pérez',
    customerPhone: '912345678',
    deliveryDate: new Date('2026-10-25T00:00:00'),
    windowStart: '18:00',
    windowEnd: '18:30',
    deliveryCode: '1234',
  };

  it('retiro en Metro: nombra la estación', () => {
    const msg = service.buildDeliveryStatusMessage(DeliveryStatus.CONFIRMED, {
      ...base,
      deliveryType: 'METRO',
      stationName: 'Los Leones',
      lineName: '3',
    });

    expect(msg).toContain('Metro Los Leones');
    expect(msg).toContain('Te esperamos en *Metro Los Leones*');
  });

  it('envío a domicilio: NO dice "Metro la estación"', () => {
    const msg = service.buildDeliveryStatusMessage(DeliveryStatus.CONFIRMED, {
      ...base,
      deliveryType: 'ENVIO_DOMICILIO',
      address: 'Av. Siempre Viva 742, Ñuñoa',
    });

    expect(msg).toContain('Av. Siempre Viva 742, Ñuñoa');
    expect(msg).not.toContain('Metro la estación');
    expect(msg).not.toContain('Te esperamos en *Metro');
  });

  it('envío a domicilio: el estado ARRIVED no dice "llegó a la estación"', () => {
    const msg = service.buildDeliveryStatusMessage(DeliveryStatus.ARRIVED, {
      ...base,
      deliveryType: 'ENVIO_DOMICILIO',
      address: 'Av. Siempre Viva 742, Ñuñoa',
    });

    expect(msg).toContain('Llegó a tu domicilio');
    expect(msg).not.toContain('Llegó a la estación');
    expect(msg).toContain('¡El repartidor llegó a tu domicilio!');
  });

  it('envío a domicilio: el recordatorio de "en camino" menciona el domicilio', () => {
    const msg = service.buildDeliveryStatusMessage(DeliveryStatus.IN_ROUTE, {
      ...base,
      deliveryType: 'ENVIO_DOMICILIO',
      address: 'Av. Siempre Viva 742, Ñuñoa',
    });

    expect(msg).toContain('a tu domicilio');
    expect(msg).not.toContain('a la estación');
  });

  it('retiro en tienda: no inventa estación', () => {
    const msg = service.buildDeliveryStatusMessage(DeliveryStatus.CONFIRMED, {
      ...base,
      deliveryType: 'RETIRO_TIENDA',
    });

    expect(msg).not.toContain('Metro la estación');
  });
});
