function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function PageShell({ children, className = "", as: Component = "div", ...props }) {
  return (
    <Component className={classNames("page-stack", className)} {...props}>
      {children}
    </Component>
  );
}
