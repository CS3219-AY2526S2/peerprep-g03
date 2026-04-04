import { Dialog as MuiDialog, DialogTitle, DialogContent, Typography } from '@mui/material';
import { darkBlue } from './../../commons';

export interface DialogProps {
    title: string;
    content: string;
    canExit?: boolean;
    isVisible : boolean; // determine whether to make the modal visible or not
    onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}

export function Dialog({title, content, canExit = true, isVisible, onClose = (event, reason) => {}}: DialogProps) {
    const modifiedOnClose = (event, reason) => {
        if (!canExit && reason === 'backdropClick') {
            return;
        }
        if (onClose) {
            onClose(event,reason);
        }
    }
    return (
        <MuiDialog open = {isVisible} disableEscapeKeyDown = {!canExit} onClose = {modifiedOnClose}>
            <DialogTitle sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.5rem',
                color: darkBlue,
            }}> {title} </DialogTitle>
            <DialogContent>
                <Typography>{content}</Typography>
            </DialogContent>
        </MuiDialog>);
}
