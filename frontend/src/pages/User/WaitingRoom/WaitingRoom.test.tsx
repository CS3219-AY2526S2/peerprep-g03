import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import WaitingRoom from './WaitingRoom';
import * as collabService from '../../../services/Collaboration';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../services/Collaboration');
const mockStore = configureStore([thunk]);

describe('WaitingRoom Component', () => {
  let store;
  const initialState = {
    collaboration: {
      value: {
        questionTopic: 'Algorithms',
        questionDifficulty: 'Medium',
        programmingLanguage: 'Python',
        partner: ''
      },
      stateStatus: 'idle'
    },
    authentication: {
      value: { username: 'testUser' },
      stateStatus: 'idle'
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    store = mockStore(initialState);
    store.dispatch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = () => render(
    <Provider store={store}>
      <BrowserRouter>
        <WaitingRoom />
      </BrowserRouter>
    </Provider>
  );

  test('Back button cancels polling and deletes match', async () => {
    collabService.getPartner.mockResolvedValue({});
    renderComponent();

    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);

    expect(collabService.deleteMatch).toHaveBeenCalledWith('testUser');
  });
});