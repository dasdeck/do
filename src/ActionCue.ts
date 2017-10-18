import Do from './Do';
import * as vscode from 'vscode';

export default class ActionCue {

    private actions: Array<object> = [];

    private running: boolean = false;

    private doInstance: Do;

    constructor(doInstance: Do) {
        this.doInstance = doInstance;
    }

    public push(action) {
        this.actions.push(action);
        this.start();
    }

    private start() {
        if (!this.running && this.actions.length) {
            this.running = true;
            this.step();
        }
    }

    private step() {
        if (this.actions.length) {
            const action = this.actions.shift();
            this.doInstance.dispatchAction(action, result => {
                this.step();
            });
        } else {
            this.running = false;
            vscode.window.showInformationMessage('do:done!');
        }

    }
}