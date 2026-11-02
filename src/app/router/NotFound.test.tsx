import { render, screen } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { expect, it } from 'vitest'
import { NotFound } from './NotFound'

it('offers a dashboard link when a route does not exist', async () => {
  const router = createRouter({
    routeTree: createRootRoute({}),
    history: createMemoryHistory({ initialEntries: ['/FIX-fe3-platform-missing'] }),
    defaultNotFoundComponent: NotFound,
  })
  await router.load()
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to dashboard' }).getAttribute('href')).toBe('/')
})
