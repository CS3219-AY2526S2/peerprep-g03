import { render, screen, fireEvent } from '@testing-library/react';
import { TextArea } from './TextArea';
import '@testing-library/jest-dom';

describe('TextArea Component', () => {
  const defaultProps = {
    label: 'Comments',
    id: 'comments-id',
    onChange: jest.fn(),
  };

  test('renders with the correct label and initial value', () => {
    render(<TextArea {...defaultProps} value="Hello World" />);

    expect(screen.getByLabelText(/comments/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Hello World');
  });

  test('calls onChange when user types', () => {
    render(<TextArea {...defaultProps} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'New text' } });

    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
  });

  test('displays error state and helper text', () => {
    render(
      <TextArea
        {...defaultProps}
        error={true}
        helperText="This field is required"
      />
    );

    const helperText = screen.getByText('This field is required');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('Mui-error');
  });

  test('renders as a multiline field with correct rows', () => {
    render(<TextArea {...defaultProps} rows={10} />);
    const textarea = screen.getByRole('textbox');

    expect(textarea).toHaveAttribute('rows', '10');
  });

  test('marks the field as required', () => {
    render(<TextArea {...defaultProps} required={true} />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });
});