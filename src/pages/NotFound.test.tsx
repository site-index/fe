import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import NotFound from './NotFound'

describe('NotFound', () => {
    it('renders 404 messaging and home link for unknown routes', () => {
        render(
            <MemoryRouter initialEntries={['/missing-path']}>
                <Routes>
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </MemoryRouter>
        )

        expect(
            screen.getByRole('heading', {
                name: 'Página no encontrada',
                level: 1,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'La dirección que buscás no existe o ya no está disponible.'
            )
        ).toBeInTheDocument()
        expect(screen.getByText('404')).toBeInTheDocument()
        const home = screen.getByRole('link', { name: 'Ir al inicio' })
        expect(home).toHaveAttribute('href', '/')
    })
})
