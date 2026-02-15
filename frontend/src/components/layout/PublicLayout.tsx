import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader.tsx';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
