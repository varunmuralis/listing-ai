import { DoorOpen, Images, LayoutDashboard, Pencil, Settings, type LucideIcon } from "lucide-react";

export interface WorkspaceSection {
  key: string;
  label: string;
  /** URL segment appended to the project base; null = the overview index route. */
  segment: string | null;
  icon: LucideIcon;
}

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  { key: "overview", label: "Overview", segment: null, icon: LayoutDashboard },
  { key: "photos", label: "Photos", segment: "photos", icon: Images },
  { key: "rooms", label: "Rooms", segment: "rooms", icon: DoorOpen },
  { key: "details", label: "Property Details", segment: "details", icon: Pencil },
  { key: "settings", label: "Settings", segment: "settings", icon: Settings },
];

export function sectionHref(projectId: string, section: WorkspaceSection): string {
  return section.segment ? `/projects/${projectId}/${section.segment}` : `/projects/${projectId}`;
}

export function isSectionActive(pathname: string, projectId: string, section: WorkspaceSection): boolean {
  const href = sectionHref(projectId, section);
  // Overview must match exactly; other sections match their subtree.
  return section.segment === null ? pathname === href : pathname.startsWith(href);
}
