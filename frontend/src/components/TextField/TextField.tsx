import { TextField as MuiTextField} from '@mui/material';

export interface TextFieldProps {
    label: string;
    required?: boolean;
    secret?: boolean;
    error?: boolean;
    helperText?: string;
    defaultValue? : string;
    value?: string;
    id: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function TextField({label,
    id,
    required = true,
    secret = false,
    error = false,
    value = "",
    helperText = "",
    defaultValue = "",
    onChange}: TextFieldProps) {
    return (
        <div className = "text-center p-3">
        <MuiTextField
            id= {id}
            label= {label}
            variant="outlined"
            required = {required}
            value={value}
            sx= {{minWidth: '300px'}}
            type = {secret ? 'password' :'text'}
            defaultValue = {defaultValue}
            error = {error}
            helperText ={helperText}
            onChange = {onChange}/>
        </div>
    );
}