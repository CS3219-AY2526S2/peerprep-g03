import { Avatar as MuiAvatar} from '@mui/material';
import { darkBlue } from './../../commons';
import Tooltip from '@mui/material/Tooltip';

export interface AvatarProps {
    username: string;
    size?: number;
    showUsername?: boolean;
}

function userIcon(username: string): string {
    return username[0];
}

function iconColor(): string {
    return darkBlue;
}

export function Avatar({username, size = 40, showUsername = false}: AvatarProps) {
    return (
        <Tooltip title={username} placement="top" disableHoverListener={!showUsername}>
            <MuiAvatar sx = {{
                bgcolor: iconColor(),
                width: size,
                height: size,
                fontSize: size * 0.5
            }}>
                {userIcon(username)}
            </MuiAvatar>
        </Tooltip>
    );
}