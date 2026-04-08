import { render, screen, fireEvent } from '@testing-library/react';
import { Table, ActionColumnName } from './Table';

describe('Table Component', () => {
  const mockColumns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'status', label: 'Status', defaultValue: 'N/A' },
    { id: 'secret', label: 'Secret', hidden: true }
  ];

  const mockRows = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2', status: 'Active' },
    { id: 3, name: 'Item 3' },
  ];

  test('renders column headers correctly and respects hidden property', () => {
    render(<Table columns={mockColumns} rows={mockRows} />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  test('renders row data and applies default values', () => {
    render(<Table columns={mockColumns} rows={mockRows} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  test('adds Action column and triggers callbacks with correct ID', () => {
    const onViewMock = jest.fn();
    const onDeleteMock = jest.fn();

    render(
      <Table
        columns={mockColumns}
        rows={mockRows}
        onView={onViewMock}
        onDelete={onDeleteMock}
      />
    );

    expect(screen.getByText(ActionColumnName)).toBeInTheDocument();

    const viewButtons = screen.getAllByTestId('InfoIcon');
    fireEvent.click(viewButtons[0].parentElement);
    expect(onViewMock).toHaveBeenCalledWith(1);

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    fireEvent.click(deleteButtons[1].parentElement);

  });

  test('handles pagination correctly', () => {
    const manyRows = Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Row ${i}` }));

    render(<Table columns={mockColumns} rows={manyRows} />);

    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextButton);

    expect(screen.queryByText('Row 0')).not.toBeInTheDocument();
    expect(screen.getByText('Row 11')).toBeInTheDocument();
  });

  test('changes rows per page', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Row ${i}` }));
    render(<Table columns={mockColumns} rows={manyRows} />);

    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    const option = screen.getByRole('option', { name: '25' });
    fireEvent.click(option);

    expect(screen.getByText('Row 24')).toBeInTheDocument();
  });
});