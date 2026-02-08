import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove Lovable branding elements (debounced to avoid excessive DOM mutations)
const removeLovableElements = () => {
  document.querySelectorAll('[data-lovable]').forEach((el) => el.remove());
  document.querySelectorAll('[class*="lovable"], [id*="lovable"], [class*="Lovable"], [id*="Lovable"]').forEach((el) => el.remove());
  document.querySelectorAll('*').forEach((el) => {
    const text = el.textContent || '';
    if (
      (text.includes('Edit with') || text.includes('Lovable') || text.includes('lovable')) &&
      ['BUTTON', 'DIV', 'A', 'SPAN', 'P'].includes(el.tagName) &&
      (text.length < 100 || text.includes('Edit with'))
    ) {
      el.remove();
    }
  });
  document.querySelectorAll('iframe[src*="lovable"], script[src*="lovable"], iframe[src*="Lovable"], script[src*="Lovable"]').forEach((el) => el.remove());
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedRemove = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    removeLovableElements();
    debounceTimer = null;
  }, 150);
};

removeLovableElements();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', debouncedRemove);
}
setTimeout(removeLovableElements, 200);
const observer = new MutationObserver(debouncedRemove);
observer.observe(document.body, { childList: true, subtree: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
