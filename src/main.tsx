import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/router';
import './index.css';

const queryClient = new QueryClient();

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass'
  });
}

import { Toaster } from 'sonner';

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </StrictMode>
  );
});
