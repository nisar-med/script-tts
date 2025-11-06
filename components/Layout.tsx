import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/icons';

export const Layout: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-primary hover:text-primary/80 transition-colors">
                Script-TTS
              </Link>

              {user && (
                <nav className="hidden md:flex space-x-4">
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/about"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/about')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    About
                  </Link>
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {loading ? (
                <LoadingSpinner className="w-5 h-5 text-primary" />
              ) : user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.email}
                  </span>
                  <Button
                    onClick={signOut}
                    variant="outline"
                    size="sm"
                  >
                    Sign Out
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Script-TTS. Powered by Google Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
};
