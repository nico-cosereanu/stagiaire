import { permanentRedirect } from "next/navigation";

/*
 * /map merged into /discover as the "Map" view toggle. Permanent
 * redirect preserves any external links / bookmarks that pointed at
 * the old fullscreen map URL.
 */
export default function MapRedirect() {
  permanentRedirect("/discover?view=map");
}
