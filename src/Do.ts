'use strict';

import ActionDispatcher from './ActionDispatcher';
import Macros from './Macros';
import ActionCue from './ActionCue';
import Evaluator from './Evaluator';

import * as vscode from 'vscode';

interface nodeCallback { (err?: any,res?:any): void; }


class Do extends vscode.Disposable{

    private cue:ActionCue;
    private dispatcher:ActionDispatcher;
    private output = vscode.window.createOutputChannel('Do');
    public macros:Macros;
    public evaluator:Evaluator;

    private commandHandle:vscode.Disposable;

    constructor() {
        super(() => {
            this.dispose();
        });

        vscode.workspace.onDidChangeConfiguration(this.configChanged);

        this.macros = new Macros(this);
        this.evaluator = new Evaluator();
        this.cue = new ActionCue();
        this.dispatcher = new ActionDispatcher(this);

        if (this.settings.onStart) {
            this.dispatchAction(this.settings.onStart);
        }


    }

    public configChanged() {
        this.dispatcher.configChanged();
        this.macros.configChanged();
    }

    public dispose() {
        if(this.settings.onQuit) {
            this.dispatchAction(this.settings.onQuit);
        }

        this.commandHandle.dispose();
    }

    public register() {
        this.commandHandle = vscode.commands.registerCommand('do', args => {
            
                    this.cue.push(done => {
                        this.dispatchAction(args, () => {
                            done();
                            this.log('done:', args);
                        });
                    });
            
                });
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
        return message;
    }

    public log(...args) {
        const message = this.console(args);
        if (this.settings.verbose) {
            vscode.window.showInformationMessage(message);
        }
        return message;
    }

    public dispatchAction(action: Array < any > | Object | String, done ? : nodeCallback, priorReault  : Array<any> = []) {

        return new Promise((resolve, reject) => {

            this.dispatcher.dispatchAction(action, (err, result) => {

                if(done) {
                    done(err,result);
                }
                if(err) {
                    reject(err);
                } else {
                    resolve(result);
                }

            },priorReault);
            
        });
    }
        
}

export default Do;