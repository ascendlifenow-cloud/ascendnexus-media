import { useEffect } from "react";

interface StructuredDataHeadProps {
  data?: unknown;
}

const selector = 'script[type="application/ld+json"][data-anm-structured-data="true"]';

export function StructuredDataHead({ data }: StructuredDataHeadProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.head.querySelector<HTMLScriptElement>(selector);
    if (!data) {
      existing?.remove();
      return;
    }
    const element = existing ?? document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.anmStructuredData = "true";
    element.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
    if (!existing) document.head.appendChild(element);
  }, [data]);

  return null;
}
