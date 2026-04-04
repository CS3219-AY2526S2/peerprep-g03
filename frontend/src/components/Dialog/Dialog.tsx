import { Dialog as MuiDialog, DialogTitle, DialogContent, Typography, DialogActions } from '@mui/material';
import { useState } from 'react';
import { Button } from '../';
import { darkBlue } from './../../commons';

export interface DialogProps {
    title: string;
    content: string;
    canExit?: boolean;
    isVisible : boolean; // determine whether to make the modal visible or not
    onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
    haveButton?: boolean;
    buttonWords?: string;
    buttonActions?: () => void;
}

export function Dialog({title,
    content,
    canExit = true,
    isVisible,
    onClose = (event, reason) => {},
    haveButton = false,
    buttonActions = () => {},
    buttonWords = ""}: DialogProps) {
    const modifiedOnClose = (event, reason) => {
        if (!canExit && reason === 'backdropClick') {
            return;
        }
        if (onClose) {
            onClose(event,reason);
        }
    }

    const modifiedButtonAction = () => {
        buttonActions();
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
            {haveButton &&
            <DialogActions>
                <Button label = {buttonWords} onClick = {modifiedButtonAction}/>
            </DialogActions>
            }
        </MuiDialog>);
}
