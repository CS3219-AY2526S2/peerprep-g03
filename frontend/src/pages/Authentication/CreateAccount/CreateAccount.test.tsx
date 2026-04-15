import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux'; // Added
import configureStore from 'redux-mock-store'; // Added
import CreateAccount from './CreateAccount';
import { createUserProfile } from '../../../services/Authentication';

const mockStore = configureStore([]);

jest.mock('../../../services/Authentication');
const mockedCreateUserProfile = createUserProfile as jest.MockedFunction<typeof createUserProfile>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CreateAccount Component', () => {
  let store: any;

  beforeEach(() => {
    store = mockStore({
      authentication: {
        value: { username: '', role: '', email: '', proficiency: '' },
        status: 'idle'
      }
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => render(
    <Provider store={store}>
      <BrowserRouter>
        <CreateAccount />
      </BrowserRouter>
    </Provider>
  );

  test('button is disabled initially', () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  test('shows validation errors when user types invalid data', () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    expect(screen.getByText(/Email needs to be in the correct format/i)).toBeInTheDocument();
  });

  test('enables button when all fields are valid and filled', () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123.' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/i), { target: { value: 'Password123.' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).not.toBeDisabled();
  });

  test('calls createUserProfile and navigates on success', async () => {
    mockedCreateUserProfile.mockResolvedValueOnce({ status: 'success', data: { message: 'OK' } });
    renderComponent();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user12' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user12@test.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'User123.' } });
    fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: 'User123.' } });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createUserProfile).toHaveBeenCalledWith('user12', 'User123.', 'user12@test.com');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});