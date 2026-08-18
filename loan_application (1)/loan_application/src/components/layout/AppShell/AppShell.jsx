import './AppShell.css';

const AppShell = ({ topBar, sidebar, children, shellClassName = '' }) => {
  return (
    <div className={`app-shell ${shellClassName}`.trim()}>
      {topBar}
      <div className="app-shell__body">
        {sidebar}
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
