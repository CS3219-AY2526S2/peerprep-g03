import { useState, useMemo, ChangeEvent } from 'react';
import { Table as GuiTable, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Stack, IconButton} from '@mui/material';
import { darkBlue } from './../../commons';
import { Edit, Delete, Info} from '@mui/icons-material';

export const ActionColumnName: string = 'Action(s)'

export interface  TableProp<T> {
    columns: { id: keyof T; label: string, minWidth?: number, hidden?: boolean, defaultValue?: T[keyof T]}[];
    rows: T[];
    onView?: (id: T['id']) => void;
    onEdit?: (id: T['id']) => void;
    onDelete?: (id: T['id']) => void;
}

export function Table<T>({columns, rows, onView, onEdit, onDelete }: TableProp<T>) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const finalColumns = useMemo(() => {
        const actionCount = [onView, onEdit, onDelete].filter(Boolean).length;
        if (actionCount != 0) {
        return [
            ...columns,
            { id: ActionColumnName as any, label: ActionColumnName, minWidth: 30 * actionCount }
        ];
        }
        return columns;
    }, [onView, onEdit, onDelete]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const visibleRows = useMemo(
        () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [rows, page, rowsPerPage]
    );

    return (
        <div className = "p-5">
        <TableContainer
        sx={{ maxHeight: 2000,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(224, 224, 224, 1)' }}>
        <GuiTable>
            <TableHead>
                <TableRow>
                    {finalColumns.filter((column) => !column.hidden).map((column) => (
                        <TableCell sx={{ backgroundColor: darkBlue, color: 'white'}}
                            key={column.id as string}
                            style={{ minWidth: column.minWidth }}
                        >
                            {column.label}
                        </TableCell>

                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {visibleRows.map((row, index) => {
                    return (
                        <TableRow key={index}>
                            {finalColumns.filter((column) => !column.hidden).map((column) => {
                                if (column.id == ActionColumnName) {
                                    return (
                                    <TableCell key = {ActionColumnName}>
                                        <Stack direction = "row" spacing= {1}>
                                            {onView && <IconButton onClick={() => onView?.(row.id)} ><Info /></IconButton>}
                                            {onEdit && <IconButton onClick={() => onEdit?.(row.id)} ><Edit/></IconButton>}
                                            {onDelete && <IconButton onClick={() => onDelete?.(row.id)} ><Delete /></IconButton>}
                                        </Stack>
                                    </TableCell>
                                    );
                                }
                            const rawValue = row[column.id];
                            const value = rawValue ?? column.defaultValue;
                            return (
                                <TableCell key={column.id as string}>
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </TableCell>
                            );
                            })}
                        </TableRow>
                    );
                })}
            </TableBody>
        </GuiTable>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
    </div>
  );
}
