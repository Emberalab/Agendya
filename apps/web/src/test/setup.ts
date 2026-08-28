import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView; components call it after selecting a slot.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
