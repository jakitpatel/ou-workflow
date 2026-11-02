import { fireEvent, render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { expect, it, vi } from 'vitest'
import { RouteErrorView } from './RouteErrorView'

it('Try Again re-runs a failed route loader instead of re-rendering the same error', async () => {
  const loader = vi
    .fn()
    .mockRejectedValueOnce(new Error('FIX-fu injected loader failure'))
    .mockResolvedValue('FIX-fu application loaded')
  const rootRoute = createRootRoute({})
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/detail',
    loader,
    component: function Detail() {
      return <p>{detailRoute.useLoaderData()}</p>
    },
    errorComponent: ({ error, reset }) => <RouteErrorView error={error} reset={reset} />,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/detail'] }),
  })

  render(<RouterProvider router={router} />)
  expect(await screen.findByText('FIX-fu injected loader failure')).toBeTruthy()
  expect(loader).toHaveBeenCalledTimes(1)

  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

  expect(await screen.findByText('FIX-fu application loaded')).toBeTruthy()
  expect(loader).toHaveBeenCalledTimes(2)
})

it('falls back to reset() outside a router', () => {
  const reset = vi.fn()
  render(<RouteErrorView error={new Error('boom')} reset={reset} />)
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
  expect(reset).toHaveBeenCalledTimes(1)
})
