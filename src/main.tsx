import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== 'undefined') {
  const removeLovableElements = () => {
    document.querySelectorAll('[data-lovable]').forEach(el => el.remove());
    document.querySelectorAll('[class*="lovable"], [id*="lovable"], [class*="Lovable"], [id*="Lovable"]').forEach(el => el.remove());
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const text = el.textContent || '';
      if ((text.includes('Edit with') || text.includes('Lovable') || text.includes('lovable')) &&
          (el.tagName === 'BUTTON' || el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'SPAN' || el.tagName === 'P')) {
        if (text.length < 100 || text.includes('Edit with')) {
          el.remove();
        }
      }
    });
    document.querySelectorAll('iframe[src*="lovable"], script[src*="lovable"], iframe[src*="Lovable"], script[src*="Lovable"]').forEach(el => el.remove());
  };
  removeLovableElements();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLovableElements);
  }
  setTimeout(removeLovableElements, 100);
  setTimeout(removeLovableElements, 500);
  setTimeout(removeLovableElements, 1000);
  const observer = new MutationObserver(() => removeLovableElements());
  observer.observe(document.body, { childList: true, subtree: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
