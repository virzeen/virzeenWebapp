/** True on the link's own page and the pages under it (/portfolio marks /portfolio/light-studies too). */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The one link of a menu that marks the current page: the most specific match, so on /shop/tops that's /shop/tops
 * (not /shop as well), and on /account/orders it's Orders, not My profile.
 */
export function currentHref(pathname: string, hrefs: readonly string[]): string | undefined {
  return hrefs.filter((href) => isCurrent(pathname, href)).sort((a, b) => b.length - a.length)[0];
}

/** The greeting's name: the first word of the account name, or null when there's no name. */
export function firstName(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}
