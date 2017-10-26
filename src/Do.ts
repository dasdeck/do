import ActionDispatcher from './ActionDispatcher';
import Macros from './Macros';

import * as vscode from 'vscode';

class Do {

    private dispatcher:ActionDispatcher;
    private output = vscode.window.createOutputChannel('Do');
    public macros:Macros;

    constructor() {
        this.dispatcher = new ActionDispatcher(this);
    }

    private getSettings(): any {
        return vscode.workspace.getConfiguration('do');

    }
    public get settings(): any {
        return this.getSettings();
    }

    private console(args) {
        args.unshift('Do:');
        args = args.map(m => {
            if (typeof m === 'object')  {
                return "\n" + JSON.stringify(m, null, 4) + "\n";
            } else {
                return m;
            }
        });

        const message = args.join(' ');
        if (this.settings.verbose) {
            this.output.show();
        }
        this.output.append(message + '\n');
        return message;
    }

    public error(...args) {
        const message = this.console(args);
        if (this.settings.verbose) {
            vscode.window.showErrorMessage(message);
        }
    }

    public log(...args) {
        const message = this.console(args);
        if (this.settings.verbose) {
            vscode.window.showInformationMessage(message);
        }
    }

    public dispatchAction(action: Array < any > | Object | String, done ? : (result) => (any), result ? : any) {
        this.dispatcher.dispatchAction(action,done,result);
    }
        
}

export default Do;