type Props = { html: string; className?: string };

export function RichContent({ html, className }: Props) {
  return (
    <div
      className={`prose-content max-w-none text-sm leading-relaxed ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
