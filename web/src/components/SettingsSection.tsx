import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <section className="panel panel-pad" style={{ marginTop: 16 }}>
      <h2 className="settings-heading">{title}</h2>
      {children}
    </section>
  );
}
