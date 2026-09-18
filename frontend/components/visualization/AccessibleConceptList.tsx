// A plain, real, keyboard-navigable list - the shared "View as list"
// alternative for every specialized mode (geography, chemistry,
// mathematics), so switching to it always gives the exact same selection
// behavior a sighted mouse user gets from the scene: activate an item,
// same result.
export type ConceptListItem = {
  key: string;
  label: string;
  detail?: string;
};

export default function AccessibleConceptList({
  items,
  emptyMessage,
}: {
  items: ConceptListItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="p-4 text-sm text-ink-muted">{emptyMessage}</p>;
  }
  return (
    <ul className="flex max-h-full flex-col gap-1 overflow-y-auto p-4">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-sm text-ink"
        >
          <span>{item.label}</span>
          {item.detail && <span className="text-xs text-ink-muted">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
