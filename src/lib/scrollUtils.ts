export function isNearBottom(
  container: HTMLElement,
  threshold = 120
): boolean {
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <
    threshold
  );
}
