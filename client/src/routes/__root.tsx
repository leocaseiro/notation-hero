import { Link, Outlet, createRootRoute } from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <nav className="flex gap-4 border-b border-gray-200 p-4">
        <Link to="/" className="font-medium text-brand-700">
          Home
        </Link>
        <Link to="/about" className="font-medium text-brand-700">
          About
        </Link>
      </nav>
      <Outlet />
    </>
  )
}
