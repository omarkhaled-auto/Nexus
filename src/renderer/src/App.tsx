import type { ReactElement } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from './components/ui/card';

/**
 * Nexus Application Root Component
 *
 * Demonstrates shadcn/ui components with dark theme support.
 * Will be expanded in 05-03 through 05-05.
 */
function App(): ReactElement {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="nexus-theme">
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-2xl font-bold text-foreground mb-4">Nexus</h1>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>UI Foundation ready</CardDescription>
          </CardHeader>
        </Card>
        <Button className="mt-4">Test Button</Button>
      </div>
    </ThemeProvider>
  );
}

export default App;
