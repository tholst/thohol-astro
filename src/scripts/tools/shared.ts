export const setMessage = (
  element: HTMLElement | null,
  text: string,
  isError = false
) => {
  if (!element) return;
  element.textContent = text;
  element.style.color = isError ? '#b42318' : '';
};
