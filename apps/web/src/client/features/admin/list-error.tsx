/** An error about a whole list (or an image with no input of its own); focusable so a failed save can reveal it. */
export function ListError({ children }: { children: React.ReactNode }) {
  return (
    <p tabIndex={-1} data-field-error className="text-small text-danger outline-none">
      {children}
    </p>
  );
}
