export const upsertMetaTag = (selector: string, attributes: Record<string, string>) => {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element?.setAttribute(name, value);
  });
};

export const upsertLinkTag = (selector: string, attributes: Record<string, string>) => {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLLinkElement>(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element?.setAttribute(name, value);
  });
};

export const removeHeadElement = (selector: string) => {
  if (typeof document === "undefined") return;
  document.head.querySelector(selector)?.remove();
};
