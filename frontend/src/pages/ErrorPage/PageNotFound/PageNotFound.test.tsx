import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import PageNotFound from './PageNotFound';

const mockStore = configureStore([]);
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('PageNotFound Component', () => {
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
          <PageNotFound />
        </BrowserRouter>
      </Provider>
    );
  };

  test('navigates to "/" when user is NOT logged in', () => {
    renderWithState({ username: "", role: "" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('navigates to "/question" when user is an Admin', () => {
    renderWithState({ username: "adminUser", role: "Admin" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/question');
  });

  test('navigates to "/start" when a regular User is logged in', () => {
    renderWithState({ username: "regularUser", role: "User" });

    fireEvent.click(screen.getByRole('button', { name: /return/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/start');
  });

  test('renders "Page Not Found" title', () => {
    renderWithState({ username: "", role: "" });
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
})