import { TextField as MuiTextField, FormControl} from '@mui/material';

export interface TextAreaProps {
    label: string;
    id: string
    rows?: number
    required?: boolean;
    error?: boolean;
    value? : string;
    helperText?: string;
    className?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function TextArea(
    {label,
    id,
    required = true,
    error = false,
    helperText = "",
    rows = 15,
    value = "",
    onChange,
    className = "p-7"}: TextFieldProps) {
    return (
        <div class = "text-center p-7">
            <FormControl fullWidth sx = {{m :1}}>
                <MuiTextField
                    id= {id}
                    label= {label}
                    variant="outlined"
                    error = {error}
                    value = {value}
                    helperText ={helperText}
                    required = {required}
                    multiline
                    onChange = {onChange}
                    rows = {rows}/>
            </FormControl>
        </div>
    );
}