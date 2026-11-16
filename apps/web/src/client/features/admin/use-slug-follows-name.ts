import { useRef } from "react";
import { slugify } from "./slugify";

/**
 * The URL slug is typed for you while the name is typed ("Linen Shirt" → "linen-shirt"), until the slug is edited by
 * hand: from then on it stays as written. A saved item keeps following only while its slug still matches its name.
 * `onChange` goes on the name field; call `restart` after the form is reset so the next name is followed again.
 */
export function useSlugFollowsName(
  initialName: string,
  getSlug: () => string,
  setSlug: (slug: string) => void,
) {
  const previousName = useRef(initialName);
  return {
    onChange(event: React.ChangeEvent<HTMLInputElement>) {
      const name = event.target.value;
      if (getSlug() === slugify(previousName.current)) setSlug(slugify(name));
      previousName.current = name;
    },
    restart(name = "") {
      previousName.current = name;
    },
  };
}
