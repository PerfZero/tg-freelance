import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type UiButtonMode = "filled" | "outline" | "bezeled" | "plain";
type UiButtonSize = "s" | "m" | "l";

export const AppRoot = ({
  children,
}: {
  appearance?: "light" | "dark";
  platform?: "ios" | "base";
  children: ReactNode;
}): JSX.Element => <div className="ui-root">{children}</div>;

export const Avatar = ({
  size,
  acronym,
  imageUrl,
}: {
  size: number;
  acronym: string;
  imageUrl?: string | null;
}): JSX.Element => (
  <div
    className="ui-avatar"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.max(Math.floor(size / 2.7), 12)}px`,
    }}
  >
    {imageUrl ? (
      <img className="ui-avatar-image" src={imageUrl} alt={acronym} />
    ) : (
      acronym
    )}
  </div>
);

export const Button = ({
  mode = "filled",
  size = "m",
  className,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  mode?: UiButtonMode;
  size?: UiButtonSize;
  children: ReactNode;
}): JSX.Element => (
  <button
    {...props}
    className={[
      "ui-btn",
      `ui-btn-${mode}`,
      `ui-btn-${size}`,
      className ?? "",
    ].join(" ")}
    type={props.type ?? "button"}
  >
    {children}
  </button>
);

export const Section = ({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: ReactNode;
}): JSX.Element => (
  <section className="ui-section">
    {header ? <header className="ui-section-header">{header}</header> : null}
    <div className="ui-section-body">{children}</div>
    {footer ? <footer className="ui-section-footer">{footer}</footer> : null}
  </section>
);

export const List = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="ui-list">{children}</div>
);

export const Cell = ({
  before,
  subtitle,
  description,
  after,
  onClick,
  children,
}: {
  before?: ReactNode;
  subtitle?: string;
  description?: string;
  after?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}): JSX.Element => {
  const content = (
    <>
      {before ? <div className="ui-cell-before">{before}</div> : null}
      <div className="ui-cell-main">
        <div className="ui-cell-title">{children}</div>
        {subtitle ? <div className="ui-cell-subtitle">{subtitle}</div> : null}
        {description ? (
          <div className="ui-cell-description">{description}</div>
        ) : null}
      </div>
      {after ? <div className="ui-cell-after">{after}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className="ui-cell ui-cell-clickable"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <div className="ui-cell">{content}</div>;
};

export const Input = ({
  header,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  header?: string;
}): JSX.Element => (
  <label className="ui-field">
    {header ? <span className="ui-field-label">{header}</span> : null}
    <input {...props} className="ui-input" />
  </label>
);

export const Textarea = ({
  header,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  header?: string;
}): JSX.Element => (
  <label className="ui-field">
    {header ? <span className="ui-field-label">{header}</span> : null}
    <textarea {...props} className="ui-input ui-textarea" rows={rows} />
  </label>
);

export const Placeholder = ({
  header,
  description,
}: {
  header: string;
  description?: string;
}): JSX.Element => (
  <div className="ui-placeholder">
    <p className="ui-placeholder-title">{header}</p>
    {description ? (
      <p className="ui-placeholder-description">{description}</p>
    ) : null}
  </div>
);
