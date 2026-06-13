export function scrollDocumentToTop(): void {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
}
