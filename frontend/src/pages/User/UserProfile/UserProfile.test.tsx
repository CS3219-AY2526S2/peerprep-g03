import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import UserProfile from './UserProfile';
import { logout } from '../../../features/Authentication/authenticationSlice';

const mockStore = configureStore([]);
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UserProfile Component', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithState = (authState) => {
    store = mockStore({
      authentication: { value: authState, status: 'idle' }
    });
    store.dispatch = jest.fn();

    return render(
      <Provider store={store}>
        <BrowserRouter>
          <UserProfile />
        </BrowserRouter>
      </Provider>
    );
  };

  test('renders basic profile information for any user', () => {
    renderWithState({
      username: 'johndoe',
      email: 'john@test.com',
      role: 'User',
      proficiency: 'Beginner'
    });

    expect(screen.getByText(/user profile/i)).toBeInTheDocument();
    expect(screen.getByText('johndoe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  test('shows Proficiency DropDown and Save button ONLY for "User" role', () => {
    renderWithState({ role: 'User', username: 'u1', proficiency: 'Beginner' });

    expect(screen.getByLabelText(/proficiency level/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  test('hides Proficiency DropDown for "Admin" role', () => {
    renderWithState({ role: 'Admin', username: 'admin1' });

    expect(screen.queryByLabelText(/proficiency level/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save profile/i })).not.toBeInTheDocument();
  });

  test('shows Admin Dashboard button ONLY for "SuperAdmin"', () => {
    renderWithState({ role: 'SuperAdmin', username: 'super' });

    const adminBtn = screen.getByRole('button', { name: /go to admin dashboard/i });
    fireEvent.click(adminBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  test('dispatches logout and navigates to home on Logout click', () => {
    renderWithState({ role: 'User', username: 'u1' });

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});