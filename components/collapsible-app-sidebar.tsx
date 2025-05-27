// File: components/collapsible-app-sidebar.tsx
// Mode: New
// Change: Creating a new wrapper component for the sidebar that uses shadcn/ui's Sidebar component and integrates the existing navigation.
// Reasoning: To enable the collapsible functionality provided by shadcn/ui.
// --- start diff ---
'use client';

import { Sidebar as ShadcnUiSidebar } from "@/components/ui/sidebar"; // Den NYA shadcn/ui sidebar
import { AppNavigationContent } from './app-navigation-content'; // Din OMDÖPTA sidebar-logik

export function CollapsibleAppSidebar() {
  return (
    <ShadcnUiSidebar 
      collapsible="icon" 
      className="border-r bg-sidebar text-sidebar-foreground" // Lägg till grundläggande styling här
    >
      <AppNavigationContent /> 
    </ShadcnUiSidebar>
  );
}
// --- end diff ---