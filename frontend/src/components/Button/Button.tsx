import { Button as MuiButton} from '@mui/material';

export interface ButtonProps {
    label: string;
    variant?: string;
    disabled?: boolean;
    onClick?: () => void;
}

export function Button({
    label,
    variant = "contained",
    disabled = false,
    onClick = () => {},
    } : AvatarProps) {
        return (
            <MuiButton variant = {variant} disabled = {disabled} onClick = {onClick}>
                {label}
            </MuiButton>);
}