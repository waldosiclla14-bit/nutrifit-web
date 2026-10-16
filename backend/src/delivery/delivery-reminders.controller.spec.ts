import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { DeliveryRemindersController } from './delivery-reminders.controller';
import { DeliveryService } from './delivery.service';

describe('DeliveryRemindersController', () => {
  let controller: DeliveryRemindersController;
  let service: { dispatchReminders: jest.Mock };
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...OLD_ENV, CRON_SECRET: 'secreto-test' };
    service = { dispatchReminders: jest.fn().mockResolvedValue({ total: 1, reminded: 1, skipped: 0, minutes: 60 }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryRemindersController],
      providers: [{ provide: DeliveryService, useValue: service }],
    }).compile();

    controller = module.get<DeliveryRemindersController>(DeliveryRemindersController);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  function req(headers: any = {}, body: any = undefined) {
    return {
      headers,
      body,
    } as any;
  }

  it('rechaza sin secreto o con secreto incorrecto', async () => {
    await expect(controller.dispatch(req({}))).rejects.toThrow(UnauthorizedException);
    await expect(
      controller.dispatch(req({ 'x-cron-secret': 'otro' })),
    ).rejects.toThrow(UnauthorizedException);
    expect(service.dispatchReminders).not.toHaveBeenCalled();
  });

  it('rechaza si el servidor no tiene CRON_SECRET', async () => {
    delete process.env.CRON_SECRET;
    await expect(
      controller.dispatch(req({ 'x-cron-secret': 'secreto-test' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('despacha con secreto válido y minutes acotado', async () => {
    const { Readable } = require('stream');
    const stream: any = Readable.from([Buffer.from(JSON.stringify({ minutes: 30 }))]);
    stream.headers = { 'x-cron-secret': 'secreto-test' };

    const res: any = await controller.dispatch(stream);

    expect(service.dispatchReminders).toHaveBeenCalledWith(30);
    expect(res).toEqual({ total: 1, reminded: 1, skipped: 0, minutes: 60 });
  });

  it('usa 60 por defecto y acota a 5..240', async () => {
    const { Readable } = require('stream');
    const mk = (body: any) => {
      const s: any = Readable.from([Buffer.from(JSON.stringify(body))]);
      s.headers = { 'x-cron-secret': 'secreto-test' };
      return s;
    };

    await controller.dispatch(mk({}));
    expect(service.dispatchReminders).toHaveBeenLastCalledWith(60);

    await controller.dispatch(mk({ minutes: 9999 }));
    expect(service.dispatchReminders).toHaveBeenLastCalledWith(240);
  });
});
