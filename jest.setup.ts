import '@testing-library/jest-dom';

// Finanzas tab visible en tests (el flag se evalúa al cargar el módulo)
process.env.NEXT_PUBLIC_FINANZAS_ENABLED = 'true';
