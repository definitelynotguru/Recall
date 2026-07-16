import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <section className="settings-section">
      <h2 className="settings-heading">{title}</h2>
      {children}
    </section>
  );
}
