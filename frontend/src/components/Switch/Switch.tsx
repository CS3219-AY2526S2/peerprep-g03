import { Switch as MuiSwitch, FormControlLabel} from '@mui/material';

export interface SwitchProps {
        label: string;
        disabled?: boolean;
        onClick?: () => void;
}

export function Switch({
    label = "",
    disabled = false,
    onClick = () => {},
    } : SwitchProps) {
        return (
            <FormControlLabel
                  control={
                    <MuiSwitch
                      disabled={disabled}
                      onChange={onClick}
                    />
                  }
                  label={label}
                />
    );
}
