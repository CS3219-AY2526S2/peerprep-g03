import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import UnauthorisedPage from './UnauthorisedPage';

const mockStore = configureStore([]);
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UnauthorisedPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithState = (authState) => {
    const store = mockStore({
      authentication: {
        value: authState,
        status: 'idle'
      }
    });

    return render(
      <Provider store={store}>
        <BrowserRouter>
          <UnauthorisedPage />
        </BrowserRouter>
      </Provider>
    );
  };

  test('renders "Unauthorised Access" title', () => {
    renderWithState({ username: "", role: "" });
    expect(screen.getByText(/unauthorised access/i)).toBeInTheDocument();
  });

  test('redirects to "/" when user is not logged in', () => {
    renderWithState({ username: "", role: "" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('redirects to "/question" when an Admin clicks return', () => {
    renderWithState({ username: "admin_user", role: "Admin" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/question');
  });

  test('redirects to "/start" when a regular User clicks return', () => {
    renderWithState({ username: "standard_user", role: "User" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/start');
  });
});