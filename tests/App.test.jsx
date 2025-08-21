import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App.jsx';

test('navigate and play full local multiplayer game', async () => {
  render(<App />);

  expect(screen.getByText(/Welcome/)).toBeInTheDocument();

  fireEvent.click(screen.getByText('Local Multiplayer'));

  expect(await screen.findByText('P1 move (Yellow)')).toBeInTheDocument();

  const cols = screen.getAllByRole('columnheader');

  fireEvent.click(cols[0]);
  fireEvent.click(cols[1]);
  fireEvent.click(cols[0]);
  fireEvent.click(cols[1]);
  fireEvent.click(cols[0]);
  fireEvent.click(cols[1]);
  fireEvent.click(cols[0]);

  expect(await screen.findByText('P1 wins!')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Home'));
  expect(screen.getByText(/Welcome/)).toBeInTheDocument();
});
