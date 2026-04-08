import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './Dialog';

jest.mock('../', () => ({
  Button: ({ label, onClick }) => <button onClick={onClick}>{label}</button>,
}));

describe('Dialog Component', () => {
  const defaultProps = {
    title: 'Test Title',
    content: 'Test Content',
    isVisible: true,
  };

  test('renders title and content correctly when visible', () => {
    render(<Dialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('does not render when isVisible is false', () => {
    render(<Dialog {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  test('renders button and triggers action when haveButton is true', () => {
    const mockAction = jest.fn();
    render(
      <Dialog
        {...defaultProps}
        haveButton={true}
        buttonWords="Confirm"
        buttonActions={mockAction}
      />
    );

    const button = screen.getByText('Confirm');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when clicking backdrop and canExit is true', () => {
    const mockOnClose = jest.fn();
    render(<Dialog {...defaultProps} onClose={mockOnClose} canExit={true} />);

    const backdrop = document.querySelector('.MuiBackdrop-root');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('does NOT call onClose when clicking backdrop and canExit is false', () => {
    const mockOnClose = jest.fn();
    render(<Dialog {...defaultProps} onClose={mockOnClose} canExit={false} />);

    const backdrop = document.querySelector('.MuiBackdrop-root');
    fireEvent.click(backdrop);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

});