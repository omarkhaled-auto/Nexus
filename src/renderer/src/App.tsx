import type { ReactElement } from 'react';

/**
 * Nexus Application Root Component
 *
 * This is a placeholder component that will be expanded in 05-02 through 05-05.
 * Currently displays a minimal UI to verify the Electron + React setup works.
 */
function App(): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '2rem',
        color: '#333',
        backgroundColor: '#f5f5f5',
      }}
    >
      Nexus
    </div>
  );
}

export default App;
