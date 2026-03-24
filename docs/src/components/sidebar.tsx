'use client';

/**
 * Styles to customize the fumadocs composed Sidebar:
 * 1. Hide the footer (GitHub icon + border-t) on desktop sidebar
 * 2. Replace the drawer close button icon (SidebarIcon → X)
 * 3. Hide the drawer footer border-t line
 */
export function SidebarStyles() {
  return (
    <style>{`
      /* Desktop sidebar: hide footer */
      #nd-sidebar > div:last-child {
        display: none !important;
      }

      /* Drawer: replace SidebarIcon with X icon in close button */
      aside[data-state] > div:first-child button[aria-label="Open Sidebar"] svg {
        display: none !important;
      }
      aside[data-state] > div:first-child button[aria-label="Open Sidebar"]::after {
        content: "";
        display: block;
        width: 1.125rem;
        height: 1.125rem;
        background-color: currentColor;
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
        mask-size: contain;
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 12 12'/%3E%3C/svg%3E");
        -webkit-mask-size: contain;
      }

      /* Drawer: hide footer border-t line */
      aside[data-state] > div:last-child.border-t {
        border-top: none !important;
      }

      /* Desktop: sidebar aside and TOC fixed within viewport */
      @media (min-width: 768px) {
        #nd-sidebar {
          position: fixed !important;
          top: 56px !important;
          left: 0 !important;
          width: var(--fd-sidebar-width) !important;
          height: calc(100dvh - 56px) !important;
          z-index: 20;
        }

        #nd-toc {
          position: fixed !important;
          top: 56px !important;
          right: 0 !important;
          height: calc(100dvh - 56px) !important;
        }
      }

      /* Drawer: move theme toggle to the left */
      aside[data-state] > div:first-child > div:first-child > div:first-child {
        order: 1;
      }
      aside[data-state] > div:first-child > div:first-child > button:last-child {
        order: 2;
      }
    `}</style>
  );
}
