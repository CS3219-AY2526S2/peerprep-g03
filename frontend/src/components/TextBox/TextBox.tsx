import { darkBlue } from './../../commons';

export interface TextBoxProps {
    label?: string;
    text: string;
    height?: number | string;
}

export function TextBox({label, text, height = 'auto'}: TextBoxProps) {
    return (
        <div className = "text-center">
            {label && <h5 className="mt-5 mb-2 font-bold tracking-tight" style={{color : darkBlue}}> {label}</h5>}
            <div className = "p-3 m-3 bg-white border border-black-900 rounded-lg">
                <p className="font-normal" style={{color : darkBlue, height:height}}>{text}</p>
            </div>
        </div>
    );
}