import { darkBlue } from './../../commons';

export interface PageTitleProps {
    text: string;
}

export function PageTitle({text}: PageTitleProps) {
    return (
        <div className = "text-center">
            <h5 className="mt-5 mb-5 font-bold tracking-tight text-4xl" style={{color : darkBlue}}> {text}</h5>
        </div>
    );
}