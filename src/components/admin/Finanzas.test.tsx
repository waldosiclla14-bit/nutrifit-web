/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Finanzas } from './Finanzas';
import { apiFetch } from '@/lib/api';
import { ConfirmProvider } from '@/lib/feedback';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

const summary = {
  from: '2026-09-01',
  to: '2026-09-30',
  ingresos: 1000000,
  cogs: 600000,
  margenBruto: 400000,
  margenBrutoPct: 40,
  comprasStock: 300000,
  comprasCount: 2,
  gastosOp: 150000,
  gastosCount: 5,
  utilidadNeta: 250000,
  utilidadPct: 25,
  ordenes: 20,
  porCategoria: [
    { categoryId: 'c1', name: 'Arriendo', color: '#8b5cf6', total: 100000, count: 1 },
  ],
};

function mockApi() {
  (apiFetch as jest.Mock).mockImplementation((path: string) => {
    if (path.startsWith('/finances/summary')) return Promise.resolve(summary);
    if (path.startsWith('/finances/expenses')) {
      if (path.includes('limit')) {
        return Promise.resolve([
          { id: 'e1', description: 'Arriendo local', amount: 100000, spentAt: '2026-09-01', notes: null, category: { id: 'c1', name: 'Arriendo', color: '#8b5cf6' } },
        ]);
      }
      return Promise.resolve({ id: 'e2' });
    }
    if (path.startsWith('/finances/categories')) {
      return Promise.resolve([{ id: 'c1', name: 'Arriendo', color: '#8b5cf6' }]);
    }
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi();
});

describe('Finanzas', () => {
  it('renders utilidad neta hero and KPIs from summary', async () => {
    render(
      <ConfirmProvider>
        <Finanzas token="" />
      </ConfirmProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Utilidad neta del período/i)).toBeInTheDocument());
    // Hero + KPIs renderizados con datos del summary
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/finances/summary'), expect.anything());
    await waitFor(() => expect(screen.getByText('Arriendo local')).toBeInTheDocument());
  });

  it('opens the expense form and saves', async () => {
    render(
      <ConfirmProvider>
        <Finanzas token="" />
      </ConfirmProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Utilidad neta del período/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /registrar gasto/i }));
    fireEvent.change(screen.getByPlaceholderText(/Descripción/i), { target: { value: 'Luz local' } });
    fireEvent.change(screen.getByPlaceholderText(/Monto/i), { target: { value: '45000' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/finances/expenses',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ description: 'Luz local', amount: 45000 }),
        }),
      ),
    );
  });
});
