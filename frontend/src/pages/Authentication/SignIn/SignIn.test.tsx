import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import SignIn from './SignIn';
import { getUserProfile } from '../../../services/Authentication';

jest.mock('../../../services/Authentication');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockStore = configureStore([]);

describe('SignIn Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
        authentication: {
        value: { username: '', role: '', email: '', proficiency: '' },
        status: 'idle'
        }
    });

    store.dispatch = jest.fn();
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => render(
    <Provider store={store}>
      <BrowserRouter>
        <SignIn />
      </BrowserRouter>
    </Provider>
  );

  test('sign in button is disabled when fields are empty', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  test('navigates to create account page on button click', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/create-account');
  });

  test('displays backend error message on failure', async () => {
    getUserProfile.mockResolvedValueOnce({ error: 'Invalid credentials' });
    renderComponent();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wrongUsername' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongPassword123.' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});