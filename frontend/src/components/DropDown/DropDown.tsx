import { TextField as MuiTextField, MenuItem} from '@mui/material';

export function convertEnumsToDropDownOption(enumObj: any): DropDownOption[] {
    return Object.values(enumObj).map((val) => ({
        value: String(val),
        label: String(val),
    }));
}

export interface DropDownOption {
    value: string
    label: string
}

export interface DropDownProps {
    label: string;
    id: string
    required?: boolean;
    error?: boolean;
    helperText?: string;
    value? : string;
    items: DropDownOption[];
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function DropDown({label,
    id,
    items,
    required = true,
    error = false,
    helperText = "",
    value = "",
    onChange
    }: DropDownProps) {
    return (
        <div class = "text-center p-3">
            <MuiTextField
                id= {id}
                label= {label}
                select
                sx= {{minWidth: '300px'}}
                variant="outlined"
                value = {value}
                required = {required}
                error = {error}
                onChange = {onChange}
                helperText ={helperText}>
                {items.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                        {item.label}
                    </MenuItem>
                ))}
            </MuiTextField>
        </div>
    );
}