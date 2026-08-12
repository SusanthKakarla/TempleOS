import { TempleHomePage } from "./home-page";

/**
 * `/` on a temple's own hostname. The layout has already resolved the temple
 * and rendered the not-found / unavailable states, so reaching here means a
 * live website.
 */
export default function SiteHome() {
  return <TempleHomePage />;
}
