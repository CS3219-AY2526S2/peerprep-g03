import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { thunk } from 'redux-thunk';
import { QuestionRecordsTable } from './QuestionRecordsTable';
import * as questionActions from '../questionSlice';


const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockStore = configureStore([thunk]);

describe('QuestionRecordsTable Component', () => {
  let store;
  const mockQuestions = [
    { id: '1', title: 'Two Sum', topic_tags: 'Arrays', difficulty: 'Easy' },
    { id: '2', title: 'Add Two Numbers', topic_tags: 'Linked List', difficulty: 'Medium' }
  ];

  beforeEach(() => {
    store = mockStore({
      question: {
        list: mockQuestions,
        stateStatus: 'idle'
      }
    });
    store.dispatch = jest.fn();
    jest.clearAllMocks();
  });

  const renderComponent = () => render(
    <Provider store={store}>
      <BrowserRouter>
        <QuestionRecordsTable />
      </BrowserRouter>
    </Provider>
  );

  test('fetches all questions on initial load', () => {
    renderComponent();
    expect(store.dispatch).toHaveBeenCalled();
  });

  test('navigates to view page and fetches details when View is clicked', () => {
    renderComponent();

    const viewBtn = screen.getAllByTestId('InfoIcon')[0];
    fireEvent.click(viewBtn.parentElement);

    expect(mockNavigate).toHaveBeenCalledWith('/question/view/1');
  });

  test('navigates to edit page and fetches details when Edit is clicked', () => {
    renderComponent();

    const editBtn = screen.getAllByTestId('EditIcon')[0];
    fireEvent.click(editBtn.parentElement);

    expect(mockNavigate).toHaveBeenCalledWith('/question/edit/1');
  });
});