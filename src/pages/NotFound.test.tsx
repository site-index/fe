import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import NotFound from './NotFound'

describe('NotFound', () => {
    it('renders 404 and home link for unknown routes', () => {
        render(
            <MemoryRouter initialEntries={['/missing-path']}>
                <Routes>
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </MemoryRouter>
        )

        expect(
            screen.getByRole('heading', { name: '404', level: 1 })
        ).toBeInTheDocument()
        expect(screen.getByText('Oops! Page not found')).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Return to Home' })
        ).toHaveAttribute('href', '/')
    })
})
