import { red } from './../../commons';

export interface ErrorMessageProps {
    text: string;
}

export function ErrorMessage({text}: ErrorMessageProps) {
    return (
        <div>
            { text &&
                <div className = "text-center">
                    <h5 className="mt-5 mb-2 font-bold tracking-tight" style={{color : red}}> Error Message(s) </h5>
                    <div className = "p-3 m-3 bg-white border border-black-900 rounded-lg max-w-md mx-auto">
                        <p className="font-normal" style={{color : red, height:'auto'}}>{text}</p>
                    </div>
                </div>
            }
        </div>
    );
}