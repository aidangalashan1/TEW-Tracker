import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement ResizeObserver; several components use it for
// responsive sizing (LayoutEngine, TopWorkersModule, FinanceCashflowModule).
// A no-op stub is enough — width/height are asserted via viewBox/props in
// tests, not the (jsdom-reported, always-0) actual layout size.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
