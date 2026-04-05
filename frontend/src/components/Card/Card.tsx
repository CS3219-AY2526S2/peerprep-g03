import { darkBlue } from './../../commons';

export interface CardProps {
    label: string;
    text: string;
}

export function Card({label, text}: CardProps) {
    return (
        <div className = "text-center">
            <h5 className ="mt-5 mb-0.5 font-bold tracking-tight" style = {{color : darkBlue}}> {label} </h5>
            <p className ="font-normal" style = {{color : darkBlue}}>{text}</p>
        </div>
    );
}